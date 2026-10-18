from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PriceAlert


class UserSerializer(serializers.ModelSerializer):
    wishlist_count = serializers.SerializerMethodField()
    alerts_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'is_staff', 'is_superuser',
            'date_joined', 'first_name', 'last_name',
            'wishlist_count', 'alerts_count',
        ]
        read_only_fields = ['id', 'is_staff', 'is_superuser', 'date_joined', 'wishlist_count', 'alerts_count']

    def get_wishlist_count(self, obj):
        try:
            return obj.wishlist_items.count()
        except Exception:
            return 0

    def get_alerts_count(self, obj):
        try:
            return obj.price_alerts.count()
        except Exception:
            return 0


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {
            'username': {'required': True},
        }

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name']
        extra_kwargs = {
            'username': {'required': False},
        }

    def validate_username(self, value):
        if self.instance and User.objects.exclude(pk=self.instance.pk).filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        if self.instance and User.objects.exclude(pk=self.instance.pk).filter(email=value).exists():
            raise serializers.ValidationError("Email already taken.")
        return value


class PriceAlertSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    product_brand = serializers.CharField(source='product.brand', read_only=True, default='')
    product_image = serializers.CharField(source='product.image_url', read_only=True, default='')
    current_lowest = serializers.SerializerMethodField()
    is_triggered = serializers.SerializerMethodField()

    class Meta:
        model = PriceAlert
        fields = [
            'id', 'product', 'product_title', 'product_category',
            'product_brand', 'product_image', 'target_price',
            'current_lowest', 'is_triggered', 'active',
            'email_sent', 'email_sent_at', 'created_at',
        ]
        read_only_fields = ['id', 'active', 'created_at', 'email_sent', 'email_sent_at']

    def get_current_lowest(self, obj):
        try:
            lowest = obj.product.offers.filter(in_stock=True).order_by('current_price').first()
            return float(lowest.current_price) if lowest else None
        except Exception:
            return None

    def get_is_triggered(self, obj):
        lowest = self.get_current_lowest(obj)
        if lowest is None:
            return False
        return lowest <= float(obj.target_price)
