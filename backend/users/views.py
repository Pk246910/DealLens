from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import UserSerializer, RegisterSerializer, ProfileUpdateSerializer
from django.contrib.auth.models import User
from products.models import Product, ProductOffer, Wishlist, URLAnalysis, Platform


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class RegisterThrottle(AnonRateThrottle):
    scope = "register"


class ForgotPasswordThrottle(AnonRateThrottle):
    scope = "forgot_password"


class ChangePasswordThrottle(UserRateThrottle):
    scope = "change_password"


class ThrottledLoginView(TokenObtainPairView):
    throttle_classes = [LoginThrottle]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users(request):
    if not request.user.is_staff:
        return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'message': 'User registered successfully',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            },
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET', 'PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)
    # PATCH/PUT - update profile
    serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(UserSerializer(request.user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ChangePasswordThrottle]

    def post(self, request):
        """
        Change the authenticated user's password.

        Request body:
            old_password  (str) – current password
            new_password  (str) – desired new password (min 8 chars)
            refresh_token (str) – the caller's current refresh token;
                                  send it so it can be blacklisted immediately,
                                  forcing re-authentication with the new password.
        """
        user = request.user
        old = request.data.get('old_password')
        new = request.data.get('new_password')
        if not old or not new:
            return Response({'detail': 'old_password and new_password required'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new) < 8:
            return Response({'new_password': ['At least 8 characters']}, status=status.HTTP_400_BAD_REQUEST)
        if not user.check_password(old):
            return Response({'detail': 'Incorrect password'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new)
        user.save()
        # Blacklist the old refresh token to invalidate all existing sessions.
        # Clients must log in again with the new password to obtain fresh tokens.
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass  # Blacklist app not available or token already invalid
        return Response({'detail': 'Password changed successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    if not request.user.is_staff:
        return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    data = {
        'users': User.objects.count(),
        'products': Product.objects.count(),
        'offers': ProductOffer.objects.count(),
        'wishlists': Wishlist.objects.count(),
        'platforms': Platform.objects.count(),
        'analyses': URLAnalysis.objects.count(),
        'recent_users': UserSerializer(User.objects.order_by('-date_joined')[:5], many=True).data,
    }
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promote_user(request, pk):
    if not request.user.is_superuser:
        return Response({'detail': 'Superuser only'}, status=status.HTTP_403_FORBIDDEN)
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    if target.pk == request.user.pk:
        return Response({'detail': 'Cannot change your own staff status'}, status=status.HTTP_400_BAD_REQUEST)
    action = request.data.get('action', 'promote')
    if action == 'promote':
        # Grant staff access only — is_staff lets the user access the Django admin
        # and staff-gated API endpoints. is_superuser is a higher privilege and must
        # be granted separately (e.g. via Django admin or a dedicated superuser endpoint).
        target.is_staff = True
    elif action == 'demote':
        target.is_staff = False
        target.is_superuser = False
    else:
        return Response({'detail': 'action must be "promote" or "demote"'}, status=status.HTTP_400_BAD_REQUEST)
    target.save()
    return Response(UserSerializer(target).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def price_alerts(request):
    from .models import PriceAlert
    from .serializers import PriceAlertSerializer
    if request.method == 'GET':
        qs = PriceAlert.objects.filter(user=request.user).select_related('product').order_by('-created_at')
        serializer = PriceAlertSerializer(qs, many=True)
        return Response(serializer.data)
    # POST
    serializer = PriceAlertSerializer(data=request.data)
    if serializer.is_valid():
        # Check duplicate active alert for same product
        if PriceAlert.objects.filter(user=request.user, product=serializer.validated_data['product'], active=True).exists():
            return Response({'detail': 'Active alert already exists for this product'}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def price_alert_detail(request, pk):
    from .models import PriceAlert
    try:
        alert = PriceAlert.objects.get(pk=pk, user=request.user)
    except PriceAlert.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    alert.delete()
    return Response({'detail': 'Deleted'}, status=status.HTTP_204_NO_CONTENT)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        from django.conf import settings
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.core.mail import send_mail
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        if not username or not email:
            return Response({'detail': 'username and email required'}, status=status.HTTP_400_BAD_REQUEST)

        # Always return the same response: never reveal whether the account exists.
        try:
            user = User.objects.get(username=username, email=email)
        except User.DoesNotExist:
            user = None

        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = PasswordResetTokenGenerator().make_token(user)
            # The frontend reads uid/token from its own /forgot-password
            # page URL. For local dev the link below works when opened
            # against the frontend origin (email shows the full link).
            frontend_origin = settings.CORS_ALLOWED_ORIGINS[0] if getattr(
                settings, "CORS_ALLOWED_ORIGINS", []) else "http://localhost:5173"
            frontend_link = f"{frontend_origin}/forgot-password?uid={uid}&token={token}"
            try:
                send_mail(
                    subject="ShopSmart password reset",
                    message=(
                        f"Hello {user.username},\n\n"
                        f"Reset your ShopSmart password using this link "
                        f"(valid for a limited time, single use):\n{frontend_link}\n\n"
                        f"If you did not request this, ignore this email."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=True,
                )
            except Exception:
                pass
        return Response(
            {'detail': 'If an account exists with these credentials, a reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


class ResetPasswordConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode

        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not uid or not token or not new_password:
            return Response(
                {'detail': 'uid, token and new_password required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response({'new_password': ['At least 8 characters']},
                            status=status.HTTP_400_BAD_REQUEST)
        if confirm_password and new_password != confirm_password:
            return Response({'confirm_password': ['Passwords do not match']},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError):
            user = None
        if user is None or not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'detail': 'Invalid or expired reset link.'},
                            status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password reset successfully. Please login with new password.'})
