from celery import shared_task
from django.core.mail import send_mail

@shared_task
def send_reset_email(to, link):
    send_mail("Reset your CareerPath AI password",
              f"Hi,\n\nUse this link to choose a new password (valid for 1 hour):\n{link}\n\n"
              "If you didn't ask for this, you can ignore this email.\n\nCareerPath AI", None, [to])
