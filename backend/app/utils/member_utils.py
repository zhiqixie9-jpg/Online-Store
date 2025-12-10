from sqlalchemy.orm import Session
from datetime import datetime, timedelta

def update_member_status(db: Session, user_id: int):

    try:
        from app.models import User, Order


        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            print(f"User {user_id} not exist")
            return False


        six_months_ago = datetime.utcnow() - timedelta(days=180)

        print(f"Check the membership status of user {user_id}, timestamp (six months ago): {six_months_ago}")


        recent_completed_orders = db.query(Order).filter(
            Order.user_id == user_id,
            Order.status == 'completed',
            Order.created_at >= six_months_ago
        ).all()

        new_member_status = len(recent_completed_orders) > 0

        print(f"User {user_id} has {len(recent_completed_orders)} completed orders within the past six months.")
        print(f"Current membership status: {user.is_member}, New membership status: {new_member_status}")

        if user.is_member != new_member_status:
            user.is_member = new_member_status
            db.commit()
            print(f"User {user_id}'s membership status has been updated to: {new_member_status}")
            return True
        else:
            print(f"User {user_id}'s membership status does not require an update.")
            return False

    except Exception as e:
        print(f"Failed to update membership status: {e}")
        db.rollback()
        return False
