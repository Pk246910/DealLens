"""Comprehensive tests for the DealLens users app.

Run with:  python manage.py test users
"""

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from users.models import PriceAlert
from products.models import Product


class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        res = self.client.post("/api/users/register/", {
            "username": "newuser",
            "email": "new@test.com",
            "password": "securepass123",
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("tokens", res.json())
        self.assertIn("access", res.json()["tokens"])
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_duplicate_username(self):
        User.objects.create_user(username="exists", email="x@test.com", password="pass12345")
        res = self.client.post("/api/users/register/", {
            "username": "exists",
            "email": "other@test.com",
            "password": "securepass123",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_register_duplicate_email(self):
        User.objects.create_user(username="user1", email="dup@test.com", password="pass12345")
        res = self.client.post("/api/users/register/", {
            "username": "user2",
            "email": "dup@test.com",
            "password": "securepass123",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_register_short_password(self):
        res = self.client.post("/api/users/register/", {
            "username": "shortpass",
            "email": "s@test.com",
            "password": "1234567",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_register_missing_fields(self):
        res = self.client.post("/api/users/register/", {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_register_invalid_email(self):
        res = self.client.post("/api/users/register/", {
            "username": "invalidemail",
            "email": "not-an-email",
            "password": "securepass123",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_register_returns_user_data(self):
        res = self.client.post("/api/users/register/", {
            "username": "returndata",
            "email": "ret@test.com",
            "password": "securepass123",
        }, format="json")
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["user"]["username"], "returndata")
        self.assertEqual(body["user"]["email"], "ret@test.com")


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="logintest", email="login@test.com", password="pass12345"
        )

    def test_login_success(self):
        res = self.client.post("/api/users/login/", {
            "username": "logintest",
            "password": "pass12345",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.json())
        self.assertIn("refresh", res.json())

    def test_login_wrong_password(self):
        res = self.client.post("/api/users/login/", {
            "username": "logintest",
            "password": "wrongpass",
        }, format="json")
        self.assertEqual(res.status_code, 401)

    def test_login_nonexistent_user(self):
        res = self.client.post("/api/users/login/", {
            "username": "nouser",
            "password": "pass12345",
        }, format="json")
        self.assertEqual(res.status_code, 401)

    def test_login_missing_fields(self):
        res = self.client.post("/api/users/login/", {}, format="json")
        self.assertEqual(res.status_code, 400)


class ProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="profileuser", email="profile@test.com", password="pass12345"
        )
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        res = self.client.get("/api/users/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["username"], "profileuser")

    def test_update_profile(self):
        res = self.client.patch("/api/users/me/", {
            "first_name": "Test",
            "last_name": "User",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["first_name"], "Test")

    def test_update_username(self):
        res = self.client.patch("/api/users/me/", {
            "username": "newname",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["username"], "newname")

    def test_update_duplicate_username(self):
        User.objects.create_user(username="taken", email="t@test.com", password="pass12345")
        res = self.client.patch("/api/users/me/", {
            "username": "taken",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_profile_requires_auth(self):
        anon = APIClient()
        res = anon.get("/api/users/me/")
        self.assertIn(res.status_code, (401, 403))


class ChangePasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="changepw", email="cpw@test.com", password="oldpassword1"
        )
        self.client.force_authenticate(user=self.user)

    def test_change_password_success(self):
        res = self.client.post("/api/users/change-password/", {
            "old_password": "oldpassword1",
            "new_password": "newpassword1",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpassword1"))

    def test_change_password_wrong_old(self):
        res = self.client.post("/api/users/change-password/", {
            "old_password": "wrongold1",
            "new_password": "newpassword1",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_change_password_too_short(self):
        res = self.client.post("/api/users/change-password/", {
            "old_password": "oldpassword1",
            "new_password": "short",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_change_password_missing_fields(self):
        res = self.client.post("/api/users/change-password/", {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_change_password_requires_auth(self):
        anon = APIClient()
        res = anon.post("/api/users/change-password/", {
            "old_password": "oldpassword1",
            "new_password": "newpassword1",
        }, format="json")
        self.assertIn(res.status_code, (401, 403))


class AdminStatsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_admin_stats_requires_staff(self):
        res = self.client.get("/api/users/admin-stats/")
        self.assertIn(res.status_code, (401, 403))

    def test_admin_stats_non_admin_forbidden(self):
        user = User.objects.create_user(username="regular", password="pass12345")
        self.client.force_authenticate(user=user)
        res = self.client.get("/api/users/admin-stats/")
        self.assertEqual(res.status_code, 403)

    def test_admin_stats_works_for_admin(self):
        admin = User.objects.create_user(username="adminstat", password="pass12345", is_staff=True)
        self.client.force_authenticate(user=admin)
        res = self.client.get("/api/users/admin-stats/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("users", data)
        self.assertIn("products", data)
        self.assertIn("recent_users", data)


class PromoteUserTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="superadmin", password="pass12345", is_staff=True, is_superuser=True
        )
        self.user = User.objects.create_user(username="regularuser", password="pass12345")

    def test_promote_requires_superuser(self):
        regular = User.objects.create_user(username="notadmin", password="pass12345")
        self.client.force_authenticate(user=regular)
        res = self.client.post(f"/api/users/{self.user.pk}/promote/", {"action": "promote"}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_promote_success(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/users/{self.user.pk}/promote/", {"action": "promote"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_staff)

    def test_demote_success(self):
        self.user.is_staff = True
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/users/{self.user.pk}/promote/", {"action": "demote"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)

    def test_cannot_promote_self(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/users/{self.admin.pk}/promote/", {"action": "promote"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_promote_invalid_action(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/users/{self.user.pk}/promote/", {"action": "invalid"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_promote_nonexistent_user(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post("/api/users/99999/promote/", {"action": "promote"}, format="json")
        self.assertEqual(res.status_code, 404)


class PriceAlertTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="alertuser", password="pass12345")
        self.product = Product.objects.create(title="Alert Product", category="Smartphones")
        self.client.force_authenticate(user=self.user)

    def test_create_alert(self):
        res = self.client.post("/api/users/alerts/", {
            "product": self.product.pk,
            "target_price": 50000,
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(PriceAlert.objects.filter(user=self.user).exists())

    def test_list_alerts(self):
        PriceAlert.objects.create(user=self.user, product=self.product, target_price=50000)
        res = self.client.get("/api/users/alerts/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

    def test_duplicate_active_alert_rejected(self):
        PriceAlert.objects.create(user=self.user, product=self.product, target_price=50000)
        res = self.client.post("/api/users/alerts/", {
            "product": self.product.pk,
            "target_price": 48000,
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_delete_alert(self):
        alert = PriceAlert.objects.create(user=self.user, product=self.product, target_price=50000)
        res = self.client.delete(f"/api/users/alerts/{alert.pk}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(PriceAlert.objects.filter(pk=alert.pk).exists())

    def test_delete_other_user_alert_forbidden(self):
        other = User.objects.create_user(username="other", password="pass12345")
        alert = PriceAlert.objects.create(user=other, product=self.product, target_price=50000)
        res = self.client.delete(f"/api/users/alerts/{alert.pk}/")
        self.assertEqual(res.status_code, 404)

    def test_alerts_requires_auth(self):
        anon = APIClient()
        res = anon.get("/api/users/alerts/")
        self.assertIn(res.status_code, (401, 403))


class ForgotPasswordTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()  # isolate the 5/hour forgot-password throttle bucket
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="forgotpw", email="forgot@test.com", password="oldpass123"
        )

    def _request_reset(self, username="forgotpw", email="forgot@test.com"):
        return self.client.post("/api/users/forgot-password/", {
            "username": username,
            "email": email,
        }, format="json")

    def test_forgot_password_request_sends_link(self):
        from django.core import mail
        res = self._request_reset()
        self.assertEqual(res.status_code, 200)
        # Password must NOT change on request alone
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpass123"))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/forgot-password?uid=", mail.outbox[0].body)

    def test_forgot_password_unknown_user_silent(self):
        from django.core import mail
        res = self._request_reset(username="nouser", email="no@test.com")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_password_valid_token(self):
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = PasswordResetTokenGenerator().make_token(self.user)
        res = self.client.post("/api/users/reset-password/", {
            "uid": uid, "token": token,
            "new_password": "newsecurepass1",
            "confirm_password": "newsecurepass1",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newsecurepass1"))

    def test_reset_password_token_single_use(self):
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = PasswordResetTokenGenerator().make_token(self.user)
        payload = {"uid": uid, "token": token,
                   "new_password": "newsecurepass1",
                   "confirm_password": "newsecurepass1"}
        self.assertEqual(
            self.client.post("/api/users/reset-password/", payload, format="json").status_code, 200)
        payload["new_password"] = payload["confirm_password"] = "anotherpass1"
        res = self.client.post("/api/users/reset-password/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    def test_reset_password_invalid_token(self):
        res = self.client.post("/api/users/reset-password/", {
            "uid": "MQ", "token": "invalid-token",
            "new_password": "newsecurepass1",
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpass123"))

    def test_reset_password_short_new(self):
        res = self.client.post("/api/users/reset-password/", {
            "uid": "MQ", "token": "x",
            "new_password": "short",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_forgot_password_missing_fields(self):
        res = self.client.post("/api/users/forgot-password/", {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_reset_password_password_mismatch(self):
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = PasswordResetTokenGenerator().make_token(self.user)
        res = self.client.post("/api/users/reset-password/", {
            "uid": uid, "token": token,
            "new_password": "newsecurepass1",
            "confirm_password": "differentpass1",
        }, format="json")
        self.assertEqual(res.status_code, 400)


class UserListSecurityTests(TestCase):
    def test_user_list_forbidden_for_anonymous(self):
        res = self.client.get("/api/users/")
        self.assertIn(res.status_code, (401, 403))

    def test_user_list_forbidden_for_non_staff(self):
        client = APIClient()
        user = User.objects.create_user(username="u1", password="pass12345")
        client.force_authenticate(user=user)
        res = client.get("/api/users/")
        self.assertEqual(res.status_code, 403)

    def test_user_list_works_for_admin(self):
        client = APIClient()
        admin = User.objects.create_user(username="adminlist", password="pass12345", is_staff=True)
        client.force_authenticate(user=admin)
        res = client.get("/api/users/")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)


class TokenRefreshTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="refreshuser", password="pass12345")

    def test_token_refresh(self):
        login = self.client.post("/api/users/login/", {
            "username": "refreshuser",
            "password": "pass12345",
        }, format="json")
        refresh = login.json()["refresh"]
        res = self.client.post("/api/users/token/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.json())

    def test_token_refresh_invalid(self):
        res = self.client.post("/api/users/token/refresh/", {"refresh": "invalidtoken"}, format="json")
        self.assertIn(res.status_code, (401, 429))


class AdminUserActivityTests(TestCase):
    def setUp(self):
        from products.models import Wishlist
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admininspector", email="admin@test.com", password="pass12345", is_staff=True
        )
        self.shopper = User.objects.create_user(
            username="shopper1", email="shopper@test.com", password="pass12345"
        )
        self.product = Product.objects.create(
            title="Sony WH-1000XM5", brand="Sony", category="Audio"
        )
        Wishlist.objects.create(user=self.shopper, product=self.product)
        PriceAlert.objects.create(user=self.shopper, product=self.product, target_price=24999)

    def test_admin_can_view_user_wishlist_and_alerts(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/users/{self.shopper.pk}/activity/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["user"]["username"], "shopper1")
        self.assertEqual(data["user"]["wishlist_count"], 1)
        self.assertEqual(data["user"]["alerts_count"], 1)
        self.assertEqual(len(data["wishlist"]), 1)
        self.assertEqual(data["wishlist"][0]["product_details"]["title"], "Sony WH-1000XM5")
        self.assertEqual(len(data["alerts"]), 1)
        self.assertEqual(float(data["alerts"][0]["target_price"]), 24999.0)

    def test_non_admin_cannot_view_user_activity(self):
        self.client.force_authenticate(user=self.shopper)
        res = self.client.get(f"/api/users/{self.shopper.pk}/activity/")
        self.assertEqual(res.status_code, 403)


class AdminMonthlyReportTests(TestCase):
    def setUp(self):
        from products.models import Wishlist
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="reportadmin", email="radmin@test.com", password="pass12345", is_staff=True
        )
        self.shopper = User.objects.create_user(
            username="reportshopper", email="rshopper@test.com", password="pass12345"
        )
        self.product = Product.objects.create(
            title="Apple iPhone 16 Pro", brand="Apple", category="Smartphones"
        )
        Wishlist.objects.create(user=self.shopper, product=self.product)
        PriceAlert.objects.create(user=self.shopper, product=self.product, target_price=119900)

    def test_non_admin_forbidden_monthly_report(self):
        self.client.force_authenticate(user=self.shopper)
        res = self.client.get("/api/users/admin-monthly-report/")
        self.assertEqual(res.status_code, 403)

    def test_admin_monthly_report_json_and_disk_persistence(self):
        import os
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/users/admin-monthly-report/?period=30d")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("report_meta", data)
        self.assertIn("summary", data)
        self.assertEqual(data["summary"]["period"]["wishlists_added"], 1)
        self.assertEqual(data["summary"]["period"]["alerts_created"], 1)
        self.assertTrue(os.path.isfile(data["report_meta"]["saved_csv_path"]))
        self.assertTrue(os.path.isfile(data["report_meta"]["saved_html_path"]))

    def test_admin_monthly_report_csv_and_html_download(self):
        self.client.force_authenticate(user=self.admin)
        csv_res = self.client.get("/api/users/admin-monthly-report/?period=30d&export=csv")
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn("attachment; filename=", csv_res["Content-Disposition"])
        self.assertIn("DEALLENS", csv_res.content.decode("utf-8-sig"))

        html_res = self.client.get("/api/users/admin-monthly-report/?period=30d&export=html")
        self.assertEqual(html_res.status_code, 200)
        self.assertIn("attachment; filename=", html_res["Content-Disposition"])
        self.assertIn("Deal<span>Lens</span>", html_res.content.decode("utf-8"))
