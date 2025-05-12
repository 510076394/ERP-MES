<script setup>
// ... 前面的代码保持不变 ...

// 方法：应用过滤条件
function applyFilter() {
  // 实现过滤逻辑
  console.log('应用过滤条件:', filter.value.inspectionStatus);
}

// 方法：搜索收货单
function searchReceipts() {
  // 处理日期范围
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    searchForm.startDate = searchForm.dateRange[0];
    searchForm.endDate = searchForm.dateRange[1];
  } else {
    searchForm.startDate = '';
    searchForm.endDate = '';
  }
  
  // 重置页码
  pagination.value.current = 1;
  
  // 加载数据
  loadReceipts();
}

// 方法：打印收货单
function printReceipt() {
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    showSnackbar('浏览器阻止了打印窗口，请允许弹出窗口后重试', 'warning');
    return;
  }
  
  const receipt = viewDialog.receipt;
  const styles = `
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1, h2 { text-align: center; }
      .receipt-info { margin-bottom: 20px; }
      .receipt-info div { margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      .footer { margin-top: 50px; display: flex; justify-content: space-between; }
      .footer div { width: 30%; }
      .right { text-align: right; }
      .center { text-align: center; }
      @media print {
        button { display: none; }
      }
    </style>
  `;
  
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>收货单 #${receipt.receipt_no}</title>
      ${styles}
    </head>
    <body>
      <h1>采购收货单</h1>
      <div class="receipt-info">
        <div><strong>收货单号:</strong> ${receipt.receipt_no}</div>
        <div><strong>收货日期:</strong> ${formatDate(receipt.receipt_date)}</div>
        <div><strong>关联订单:</strong> ${receipt.order_no || '-'}</div>
        <div><strong>供应商:</strong> ${receipt.supplier_name || '-'}</div>
        <div><strong>收货人:</strong> ${receipt.operator || '-'}</div>
        <div><strong>入库仓库:</strong> ${receipt.warehouse_name || '-'}</div>
        <div><strong>状态:</strong> ${getStatusText(receipt.status)}</div>
        <div><strong>备注:</strong> ${receipt.remarks || '-'}</div>
      </div>
      
      <h2>物料清单</h2>
      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th>物料名称</th>
            <th>规格</th>
            <th>单位</th>
            <th>订单数量</th>
            <th>实收数量</th>
            <th>合格数量</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          ${(receipt.items || []).map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.material_name || '-'}</td>
              <td>${item.specification || '-'}</td>
              <td>${item.unit_name || '-'}</td>
              <td class="right">${item.ordered_quantity || 0}</td>
              <td class="right">${item.received_quantity || 0}</td>
              <td class="right">${item.qualified_quantity || 0}</td>
              <td>${item.remarks || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <div>
          <p><strong>仓库:</strong> ____________</p>
        </div>
        <div class="center">
          <p><strong>收货人:</strong> ____________</p>
        </div>
        <div class="right">
          <p><strong>供应商:</strong> ____________</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <button onclick="window.print(); window.close();">打印</button>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
  
  // 等待图片加载完成后打印
  printWindow.onload = function() {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };
}
</script>

<style scoped>
.purchase-receipts-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #303133;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.statistics-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  margin-right: 15px;
  text-align: center;
  margin-bottom: 15px;
}

.stat-card:last-child {
  margin-right: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.actions-cell {
  display: flex;
  justify-content: space-around;
}

.el-table :deep(.warning-row) {
  background-color: #fdf6ec;
}

.el-table :deep(.success-row) {
  background-color: #f0f9eb;
}

.el-table :deep(.error-row) {
  background-color: #fef0f0;
}

.form-row {
  display: flex;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.form-item {
  margin-right: 15px;
  margin-bottom: 15px;
}

.right-aligned-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.button-gap {
  margin-left: 10px;
}

.read-only-field {
  font-weight: bold;
  color: #606266;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-label {
  font-weight: bold;
  color: #606266;
  margin-right: 5px;
}

.detail-value {
  color: #303133;
}

.detail-row {
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
}

.detail-item {
  flex: 1;
  min-width: 250px;
  margin-bottom: 10px;
}

.status-tag {
  border-radius: 10px;
  padding: 2px 10px;
}

.add-button {
  margin-bottom: 15px;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.filter-buttons {
  display: flex;
  gap: 10px;
}

.filter-badge {
  margin-right: 10px;
}

.receipt-info-section {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 1280px) {
  .receipt-info-section {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .receipt-info-section {
    grid-template-columns: 1fr;
  }
}
</style> 