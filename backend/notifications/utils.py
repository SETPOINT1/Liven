from accounts.models import User
from notifications.models import Notification


def create_notification(user_id, notification_type, title, body, data=None):
    """Create a notification for a specific user."""
    return Notification.objects.create(
        user_id=user_id,
        type=notification_type,
        title=title,
        body=body,
        data=data or {},
    )


def notify_all_residents(project_id, notification_type, title, body, data=None):
    """Send a notification to all approved residents in a project.

    Returns the list of created Notification objects.
    """
    residents = User.objects.filter(
        project_id=project_id,
        role='resident',
        status='approved',
    )
    notifications = []
    for resident in residents:
        notif = create_notification(
            user_id=resident.id,
            notification_type=notification_type,
            title=title,
            body=body,
            data=data,
        )
        notifications.append(notif)
    return notifications
