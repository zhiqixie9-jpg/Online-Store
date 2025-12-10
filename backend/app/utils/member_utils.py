from sqlalchemy.orm import Session
from datetime import datetime, timedelta

def update_member_status(db: Session, user_id: int):
    """更新用户会员状态"""
    try:
        from app.models import User, Order

        # 查找用户
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            print(f"用户 {user_id} 不存在")
            return False

        # 计算半年前的日期
        six_months_ago = datetime.utcnow() - timedelta(days=180)

        print(f"检查用户 {user_id} 的会员状态，半年前时间: {six_months_ago}")

        # 查询用户半年内的已完成订单
        recent_completed_orders = db.query(Order).filter(
            Order.user_id == user_id,
            Order.status == 'completed',
            Order.created_at >= six_months_ago
        ).all()

        # 更新会员状态
        new_member_status = len(recent_completed_orders) > 0

        print(f"用户 {user_id} 找到 {len(recent_completed_orders)} 个半年内的已完成订单")
        print(f"当前会员状态: {user.is_member}, 新会员状态: {new_member_status}")

        if user.is_member != new_member_status:
            user.is_member = new_member_status
            db.commit()
            print(f"用户 {user_id} 会员状态更新为: {new_member_status}")
            return True
        else:
            print(f"用户 {user_id} 会员状态无需更新")
            return False

    except Exception as e:
        print(f"更新会员状态失败: {e}")
        db.rollback()
        return False