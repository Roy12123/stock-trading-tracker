from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///accounting.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 修正 Render 的 PostgreSQL URL 格式
if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://', 1)

db = SQLAlchemy(app)

# 數據庫模型
class StockTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(100), nullable=False)  # 公司名稱
    profit_loss = db.Column(db.Float, nullable=False)  # 損益金額
    date = db.Column(db.Date, nullable=False, default=date.today)
    notes = db.Column(db.String(200))  # 備註
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_name': self.company_name,
            'profit_loss': self.profit_loss,
            'date': self.date.strftime('%Y-%m-%d'),
            'notes': self.notes
        }

# 路由
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    transactions = StockTransaction.query.order_by(StockTransaction.date.desc()).all()
    return jsonify([t.to_dict() for t in transactions])

@app.route('/api/transactions', methods=['POST'])
def create_transaction():
    data = request.get_json()
    transaction = StockTransaction(
        company_name=data['company_name'],
        profit_loss=data['profit_loss'],
        date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
        notes=data.get('notes', '')
    )
    db.session.add(transaction)
    db.session.commit()
    return jsonify(transaction.to_dict()), 201

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    transaction = StockTransaction.query.get_or_404(transaction_id)
    db.session.delete(transaction)
    db.session.commit()
    return '', 204

@app.route('/api/transactions/delete-all', methods=['DELETE'])
def delete_all_transactions():
    """刪除所有交易記錄"""
    try:
        num_deleted = StockTransaction.query.delete()
        db.session.commit()
        return jsonify({
            'success': True,
            'deleted_count': num_deleted,
            'message': f'成功刪除 {num_deleted} 筆交易記錄'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'刪除失敗: {str(e)}'
        }), 500


@app.route('/api/import-data', methods=['POST'])
def import_data():
    """匯入交易資料"""
    data = request.get_json()
    transactions_data = data.get('transactions', [])
    
    imported_count = 0
    for transaction in transactions_data:
        try:
            # 解析日期
            date_str = transaction.get('date')
            if date_str:
                if '/' in date_str:
                    # 處理 2024/1/1 格式
                    date_parts = date_str.split('/')
                    if len(date_parts) == 3:
                        year, month, day = date_parts
                        transaction_date = date(int(year), int(month), int(day))
                    else:
                        continue
                else:
                    # 處理其他格式
                    transaction_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                continue
            
            # 處理損益金額
            profit_amount = transaction.get('profit', 0)
            loss_amount = transaction.get('loss', 0)
            
            # 計算淨損益
            net_profit = profit_amount - loss_amount
            
            # 創建交易記錄
            stock_transaction = StockTransaction(
                company_name=transaction.get('company_name', ''),
                profit_loss=net_profit,
                date=transaction_date,
                notes=f"匯入資料 - 賺: {profit_amount}, 虧: {loss_amount}"
            )
            
            db.session.add(stock_transaction)
            imported_count += 1
            
        except Exception as e:
            print(f"匯入錯誤: {e}")
            continue
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'imported_count': imported_count,
            'message': f'成功匯入 {imported_count} 筆交易記錄'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'匯入失敗: {str(e)}'
        }), 500

@app.route('/api/statistics')
def get_statistics():
    today = date.today()
    period = request.args.get('period', 'monthly')  # 預設為每月

    # 計算本週收益（週一到週日）
    week_start = today - timedelta(days=today.weekday())
    weekly_profit = db.session.query(db.func.sum(StockTransaction.profit_loss)).filter(
        StockTransaction.date >= week_start
    ).scalar() or 0

    # 計算本月收益
    month_start = today.replace(day=1)
    monthly_profit = db.session.query(db.func.sum(StockTransaction.profit_loss)).filter(
        StockTransaction.date >= month_start
    ).scalar() or 0

    # 計算本年收益
    year_start = today.replace(month=1, day=1)
    yearly_profit = db.session.query(db.func.sum(StockTransaction.profit_loss)).filter(
        StockTransaction.date >= year_start
    ).scalar() or 0


    # 按公司名稱統計收益
    company_profits = db.session.query(
        StockTransaction.company_name,
        db.func.sum(StockTransaction.profit_loss)
    ).filter(
        StockTransaction.date >= month_start
    ).group_by(StockTransaction.company_name).all()

    # 根據時間範圍計算營收資料
    revenues = []

    if period == 'weekly':
        # 計算過去12週
        for i in range(11, -1, -1):
            week_start_date = today - timedelta(days=today.weekday()) - timedelta(weeks=i)
            week_end_date = week_start_date + timedelta(days=6)

            week_profit = db.session.query(db.func.sum(StockTransaction.profit_loss)).filter(
                StockTransaction.date >= week_start_date,
                StockTransaction.date <= week_end_date
            ).scalar() or 0

            revenues.append({
                'period': f'{week_start_date.strftime("%m/%d")}',
                'revenue': float(week_profit)
            })

    elif period == 'monthly':
        # 計算過去12個月（手機版會只顯示8個月）
        for i in range(11, -1, -1):
            # 計算目標月份
            target_month = today.month - i
            target_year = today.year

            while target_month <= 0:
                target_month += 12
                target_year -= 1

            month_date = date(target_year, target_month, 1)

            # 計算下個月
            next_month = target_month + 1
            next_year = target_year
            if next_month > 12:
                next_month = 1
                next_year += 1

            next_month_date = date(next_year, next_month, 1)

            month_profit = db.session.query(db.func.sum(StockTransaction.profit_loss)).filter(
                StockTransaction.date >= month_date,
                StockTransaction.date < next_month_date
            ).scalar() or 0

            revenues.append({
                'period': month_date.strftime('%Y-%m'),
                'revenue': float(month_profit)
            })

    elif period == 'yearly':
        # 計算過去5年
        current_year = today.year
        for i in range(4, -1, -1):
            year = current_year - i
            year_start_date = date(year, 1, 1)
            year_end_date = date(year, 12, 31)

            year_profit = db.session.query(db.func.sum(StockTransaction.profit_loss)).filter(
                StockTransaction.date >= year_start_date,
                StockTransaction.date <= year_end_date
            ).scalar() or 0

            revenues.append({
                'period': str(year),
                'revenue': float(year_profit)
            })

    return jsonify({
        'weekly_profit': float(weekly_profit),
        'monthly_profit': float(monthly_profit),
        'yearly_profit': float(yearly_profit),
        'company_profits': [{
            'company_name': name,
            'profit': float(profit)
        } for name, profit in company_profits],
        'revenues': revenues
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    app.run(debug=True, port=5001)
