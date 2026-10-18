from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    get_users, register_user, me, ChangePasswordView,
    admin_stats, admin_user_activity, admin_monthly_report, promote_user,
    price_alerts, price_alert_detail,
    ForgotPasswordView, ResetPasswordConfirmView, ThrottledLoginView,
)

urlpatterns = [
    path('', get_users, name='user-list'),
    path('register/', register_user, name='register'),
    path('login/', ThrottledLoginView.as_view(), name='token_obtain_pair'),
    # Legacy /token/ endpoint removed — use /login/ instead
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', me, name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('admin-stats/', admin_stats, name='admin_stats'),
    path('admin-monthly-report/', admin_monthly_report, name='admin_monthly_report'),
    path('<int:pk>/activity/', admin_user_activity, name='admin_user_activity'),
    path('<int:pk>/promote/', promote_user, name='promote_user'),
    path('alerts/', price_alerts, name='price_alerts'),
    path('alerts/<int:pk>/', price_alert_detail, name='price_alert_detail'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordConfirmView.as_view(), name='reset_password'),
]
