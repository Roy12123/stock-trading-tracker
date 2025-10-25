"""
資料庫遷移腳本 - 新增 is_personal 欄位
用於更新已存在的資料庫結構
"""
from app import app, db
from sqlalchemy import text

def migrate_database():
    with app.app_context():
        try:
            # 檢查 is_personal 欄位是否存在
            result = db.session.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='stock_transaction' AND column_name='is_personal'"
            ))

            if result.fetchone() is None:
                print("正在新增 is_personal 欄位...")
                # PostgreSQL 語法
                db.session.execute(text(
                    "ALTER TABLE stock_transaction "
                    "ADD COLUMN is_personal BOOLEAN DEFAULT FALSE"
                ))
                db.session.commit()
                print("✅ is_personal 欄位新增成功！")
            else:
                print("✅ is_personal 欄位已存在，無需遷移。")

        except Exception as e:
            # 如果是 SQLite，使用不同的檢查方式
            try:
                db.session.rollback()
                result = db.session.execute(text("PRAGMA table_info(stock_transaction)"))
                columns = [row[1] for row in result.fetchall()]

                if 'is_personal' not in columns:
                    print("正在新增 is_personal 欄位（SQLite）...")
                    db.session.execute(text(
                        "ALTER TABLE stock_transaction "
                        "ADD COLUMN is_personal BOOLEAN DEFAULT 0"
                    ))
                    db.session.commit()
                    print("✅ is_personal 欄位新增成功！")
                else:
                    print("✅ is_personal 欄位已存在，無需遷移。")
            except Exception as e2:
                print(f"❌ 遷移失敗: {e2}")
                print("如果資料表不存在，請先執行 init_db.py")

if __name__ == '__main__':
    migrate_database()
