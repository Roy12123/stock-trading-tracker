// 全局變量
let transactions = [];
let stockChart = null;
let currentPeriod = 'weekly';  // 預設為每週

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', function() {
    loadTransactions();
    loadStatistics();
    setupEventListeners();
});

// 設置事件監聽器
function setupEventListeners() {
    // 交易表單提交
    document.getElementById('transactionForm').addEventListener('submit', handleTransactionSubmit);
    
    // 匯入表單提交
    document.getElementById('importForm').addEventListener('submit', handleImportSubmit);
    
    // 設置今天的日期
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
}


// 載入交易記錄
async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions');
        transactions = await response.json();
        displayTransactions();
    } catch (error) {
        console.error('載入交易記錄失敗:', error);
        showNotification('載入交易記錄失敗', 'error');
    }
}

// 載入統計數據
async function loadStatistics(period = currentPeriod) {
    try {
        const response = await fetch(`/api/statistics?period=${period}`);
        const stats = await response.json();

        // 更新週/月/年收益
        document.getElementById('weekly-profit').textContent = formatCurrency(stats.weekly_profit);
        document.getElementById('monthly-profit').textContent = formatCurrency(stats.monthly_profit);
        document.getElementById('yearly-profit').textContent = formatCurrency(stats.yearly_profit);

        // 更新收益顏色
        updateProfitColors(stats.weekly_profit, stats.monthly_profit, stats.yearly_profit);

        // 更新營收圖表
        updateRevenueChart(stats.revenues, period);
    } catch (error) {
        console.error('載入統計數據失敗:', error);
        showNotification('載入統計數據失敗', 'error');
    }
}

// 切換圖表時間範圍
function changeChartPeriod(period) {
    currentPeriod = period;

    // 更新按鈕狀態
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');

    // 重新載入統計數據
    loadStatistics(period);
}


// 顯示交易記錄
function displayTransactions() {
    const tbody = document.getElementById('transactions-tbody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h3>尚無交易記錄</h3>
                    <p>點擊「新增交易」開始記錄股票交易</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = transactions.map(transaction => `
        <tr>
            <td>${formatDate(transaction.date)}</td>
            <td><strong>${transaction.company_name}</strong></td>
            <td class="${transaction.profit_loss >= 0 ? 'amount-income' : 'amount-expense'}">
                ${transaction.profit_loss >= 0 ? '+' : ''}${formatCurrency(transaction.profit_loss)}
            </td>
            <td>${transaction.notes || '-'}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteTransaction(${transaction.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}


// 處理交易表單提交
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const formData = {
        company_name: document.getElementById('companyName').value,
        profit_loss: parseFloat(document.getElementById('profitLoss').value),
        date: document.getElementById('transactionDate').value,
        notes: document.getElementById('transactionNotes').value
    };
    
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('交易記錄新增成功', 'success');
            closeModal('addTransactionModal');
            document.getElementById('transactionForm').reset();
            document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
            loadTransactions();
            loadStatistics();
        } else {
            throw new Error('新增失敗');
        }
    } catch (error) {
        console.error('新增交易記錄失敗:', error);
        showNotification('新增交易記錄失敗', 'error');
    }
}


// 更新收益顏色
function updateProfitColors(weekly, monthly, yearly) {
    const weeklyElement = document.getElementById('weekly-profit');
    const monthlyElement = document.getElementById('monthly-profit');
    const yearlyElement = document.getElementById('yearly-profit');
    
    weeklyElement.style.color = weekly >= 0 ? '#27ae60' : '#e74c3c';
    monthlyElement.style.color = monthly >= 0 ? '#27ae60' : '#e74c3c';
    yearlyElement.style.color = yearly >= 0 ? '#27ae60' : '#e74c3c';
}

// 刪除交易記錄
async function deleteTransaction(id) {
    if (!confirm('確定要刪除這筆交易記錄嗎？')) {
        return;
    }

    try {
        const response = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('交易記錄刪除成功', 'success');
            loadTransactions();
            loadStatistics();
        } else {
            throw new Error('刪除失敗');
        }
    } catch (error) {
        console.error('刪除交易記錄失敗:', error);
        showNotification('刪除交易記錄失敗', 'error');
    }
}

// 刪除所有交易記錄
async function deleteAllTransactions() {
    if (!confirm('⚠️ 警告：確定要刪除所有交易記錄嗎？此操作無法復原！')) {
        return;
    }

    // 二次確認
    if (!confirm('請再次確認：真的要刪除所有資料嗎？')) {
        return;
    }

    try {
        const response = await fetch('/api/transactions/delete-all', {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showNotification(result.message, 'success');
            loadTransactions();
            loadStatistics();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('刪除所有交易記錄失敗:', error);
        showNotification('刪除所有交易記錄失敗', 'error');
    }
}

// 更新營收圖表
function updateRevenueChart(revenueData, period) {
    const ctx = document.getElementById('stockChart').getContext('2d');

    if (stockChart) {
        stockChart.destroy();
    }

    if (!revenueData || revenueData.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('尚無營收記錄', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    // 手機版只顯示最近8個月，桌面版顯示全部
    const isMobile = window.innerWidth <= 768;
    let displayData = revenueData;

    if (isMobile && period === 'monthly' && revenueData.length > 8) {
        displayData = revenueData.slice(-8);  // 只顯示最近8個月
    }

    // 格式化標籤
    const labels = displayData.map(item => {
        if (period === 'weekly') {
            return item.period;  // 已經是 MM/DD 格式
        } else if (period === 'monthly') {
            const parts = item.period.split('-');
            return `${parseInt(parts[1])}月`;
        } else if (period === 'yearly') {
            return item.period + '年';
        }
        return item.period;
    });

    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '營收',
                data: displayData.map(item => item.revenue),
                borderColor: 'rgba(52, 152, 219, 1)',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,  // 平滑曲線
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(52, 152, 219, 1)',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const originalIndex = isMobile && period === 'monthly' ?
                                revenueData.length - 8 + index : index;
                            return revenueData[originalIndex].period;
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            const color = value >= 0 ? '📈' : '📉';
                            return `${color} 營收: ${formatCurrency(value)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        },
                        font: {
                            size: 11
                        },
                        color: '#7f8c8d'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: isMobile ? 13 : 16,
                            weight: 'bold'
                        },
                        color: '#2c3e50',
                        maxRotation: 0,
                        minRotation: 0
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            }
        }
    });
}

// 處理匯入表單提交
async function handleImportSubmit(e) {
    e.preventDefault();
    
    const importData = document.getElementById('importData').value.trim();
    
    if (!importData) {
        showNotification('請輸入要匯入的資料', 'error');
        return;
    }
    
    try {
        // 解析 Tab 分隔的資料
        const lines = importData.split('\n').filter(line => line.trim());
        const transactions = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // 跳過標題行
            if (i === 0 && (line.includes('日期') || line.includes('賺') || line.includes('虧'))) {
                continue;
            }
            
            // 使用 Tab 分隔
            const parts = line.split('\t').map(part => part.trim());
            
            if (parts.length >= 4) {
                const [date, profit, loss, company] = parts;
                transactions.push({
                    date: date,
                    profit: parseFloat(profit) || 0,
                    loss: parseFloat(loss) || 0,
                    company_name: company
                });
            }
        }
        
        if (transactions.length === 0) {
            showNotification('沒有找到有效的交易資料', 'error');
            return;
        }
        
        // 發送匯入請求
        const response = await fetch('/api/import-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transactions })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            closeModal('importModal');
            document.getElementById('importData').value = '';
            loadTransactions();
            loadStatistics();
        } else {
            showNotification(result.message, 'error');
        }
        
    } catch (error) {
        console.error('匯入資料失敗:', error);
        showNotification('匯入資料失敗', 'error');
    }
}

// 模態框控制
function openAddTransactionModal() {
    document.getElementById('addTransactionModal').style.display = 'block';
}

function openImportModal() {
    document.getElementById('importModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 點擊模態框外部關閉
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// 工具函數
function formatCurrency(amount) {
    return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // 添加樣式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    
    // 添加動畫樣式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // 3秒後自動移除
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
