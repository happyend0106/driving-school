// 数据存储
let students = [];
let trainingRecords = [];
let currentStudentId = null;
let editStudentIndex = null;
let editTrainingIndex = null;
let sortField = null;
let sortOrder = 'asc';

// Worker API 基础 URL
const API_URL = 'https://wdkm3.20121020.xyz';

// 身份证号码校验
function validateIdCard(idCard) {
  if (!idCard || idCard === '待录入') return true;
  const regex = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/;
  return regex.test(idCard);
}

// 隐藏身份证号码
function maskIdCard(idCard) {
  if (!idCard || idCard === '待录入') return '待录入';
  if (idCard.length !== 18) return idCard;
  return `${idCard.slice(0, 6)}******${idCard.slice(-4)}`;
}

// 生成时间选项
function generateTimeOptions() {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    times.push(`${hour.toString().padStart(2, '0')}:00`);
    times.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return times;
}

// 填充时间下拉框
function populateTimeSelects() {
  const startSelect = document.getElementById('startTime');
  const endSelect = document.getElementById('endTime');
  if (!startSelect || !endSelect) return;

  const times = generateTimeOptions();
  startSelect.innerHTML = '<option value="" disabled selected>选择开始时间</option>';
  endSelect.innerHTML = '<option value="" disabled selected>选择结束时间</option>';
  times.forEach(time => {
    const option = document.createElement('option');
    option.value = time;
    option.textContent = time;
    startSelect.appendChild(option.cloneNode(true));
    endSelect.appendChild(option);
  });
}

// 计算时长
function calculateDuration(startTime, endTime) {
  const start = new Date(`1970-01-01 ${startTime}`);
  const end = new Date(`1970-01-01 ${endTime}`);
  const duration = (end - start) / 1000 / 60;
  if (duration <= 0 || duration % 30 !== 0) return null;
  return duration;
}

// 获取数据
async function fetchData(endpoint) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return response.json();
}

// 保存数据
async function saveData(endpoint, method, body) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Failed to save ${endpoint}`);
  return response.json();
}

// 排序学员列表
function sortStudents(field) {
  console.log(`排序字段：${field}`);
  if (sortField === field) {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortOrder = 'asc';
  }

  students.sort((a, b) => {
    let valueA = a[field] || '';
    let valueB = b[field] || '';
    if (field === 'subject2Pass') {
      valueA = a[field] ? '合格' : '未合格';
      valueB = b[field] ? '合格' : '未合格';
    }
    if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  renderStudents();
  updateSortIndicators();
}

// 更新排序指示箭头
function updateSortIndicators() {
  const fields = ['name', 'idCard', 'subject2Pass', 'subject3Status', 'vehicleType', 'remarks'];
  fields.forEach(field => {
    const indicator = document.getElementById(`sort-${field}`);
    if (indicator) {
      indicator.textContent = field === sortField ? (sortOrder === 'asc' ? '↑' : '↓') : '';
    }
  });
}

// 渲染学员列表
async function renderStudents(filterQuery = '') {
  const tbody = document.getElementById('studentTable');
  if (!tbody) return;
  try {
    students = await fetchData('students');
    tbody.innerHTML = '';
    students
      .filter(s => !filterQuery || 
        (s.idCard && s.idCard !== '待录入' && s.idCard.toLowerCase().includes(filterQuery.toLowerCase())) ||
        s.name.toLowerCase().includes(filterQuery.toLowerCase())
      )
      .forEach((student, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${student.name}</td>
          <td>${maskIdCard(student.idCard)}</td>
          <td>${student.subject2Pass ? '合格' : '未合格'}</td>
          <td>${student.subject3Status}</td>
          <td>${student.vehicleType}</td>
          <td>${student.remarks || ''}</td>
          <td>
            <button class="btn btn-info btn-sm" onclick="viewTraining(${index})">查看学时</button>
            <button class="btn btn-warning btn-sm" onclick="openEditStudentModal(${index})">编辑</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent(${index})">删除</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    updateSortIndicators();
  } catch (error) {
    console.error('渲染学员列表失败:', error);
    alert('无法加载学员数据，请检查网络！');
  }
}

// 搜索学员
function searchStudents() {
  console.log('搜索按钮点击');
  const searchQuery = document.getElementById('searchIdCard').value;
  renderStudents(searchQuery);
}

// 打开添加学员模态框
function openAddModal() {
  console.log('添加学员按钮点击');
  editStudentIndex = null;
  document.getElementById('modalTitle').textContent = '添加学员';
  document.getElementById('studentForm').reset();
  document.getElementById('idCard').value = '';
  document.getElementById('name').value = '';
  document.getElementById('subject2Pass').checked = false;
  document.getElementById('subject3Status').value = '练习中';
  document.getElementById('vehicleType').value = 'C1';
  document.getElementById('remarks').value = '';
  document.getElementById('staticHours').value = '';
  document.getElementById('dynamicHours').value = '';
  new bootstrap.Modal(document.getElementById('studentModal')).show();
}

// 打开编辑学员模态框
function openEditStudentModal(index) {
  console.log('编辑按钮点击，索引：', index);
  editStudentIndex = index;
  const student = students[index];
  document.getElementById('modalTitle').textContent = '编辑学员';
  document.getElementById('idCard').value = student.idCard === '待录入' ? '' : student.idCard;
  document.getElementById('name').value = student.name;
  document.getElementById('subject2Pass').checked = student.subject2Pass;
  document.getElementById('subject3Status').value = student.subject3Status;
  document.getElementById('vehicleType').value = student.vehicleType;
  document.getElementById('remarks').value = student.remarks || '';
  document.getElementById('staticHours').value = student.staticHours || '';
  document.getElementById('dynamicHours').value = student.dynamicHours || '';
  new bootstrap.Modal(document.getElementById('studentModal')).show();
}

// 保存学员
async function saveStudent() {
  console.log('保存按钮点击');
  let idCard = document.getElementById('idCard').value.trim();
  const name = document.getElementById('name').value.trim();
  const subject2Pass = document.getElementById('subject2Pass').checked;
  const subject3Status = document.getElementById('subject3Status').value;
  const vehicleType = document.getElementById('vehicleType').value;
  const remarks = document.getElementById('remarks').value;
  const staticHours = document.getElementById('staticHours').value ? parseInt(document.getElementById('staticHours').value) : 0;
  const dynamicHours = document.getElementById('dynamicHours').value ? parseInt(document.getElementById('dynamicHours').value) : 0;

  idCard = idCard || '待录入';
  if (idCard !== '待录入' && !validateIdCard(idCard)) {
    alert('身份证号码格式不正确！');
    return;
  }
  if (!name) {
    alert('请输入姓名！');
    return;
  }
  if (staticHours < 0 || dynamicHours < 0) {
    alert('学时不能为负数！');
    return;
  }

  const student = { idCard, name, subject2Pass, subject3Status, vehicleType, remarks, staticHours, dynamicHours };
  try {
    if (editStudentIndex === null) {
      if (idCard !== '待录入' && students.some(s => s.idCard === idCard)) {
        alert('身份证号码已存在！');
        return;
      }
      await saveData('students', 'POST', student);
    } else {
      if (idCard !== '待录入' && students.some((s, i) => s.idCard === idCard && i !== editStudentIndex)) {
        alert('身份证号码已存在！');
        return;
      }
      await saveData('students', 'PUT', { index: editStudentIndex, student });
    }
    await renderStudents();
    bootstrap.Modal.getInstance(document.getElementById('studentModal')).hide();
  } catch (error) {
    console.error('保存学员失败:', error);
    alert('保存学员失败，请检查网络！');
  }
}

// 删除学员
async function deleteStudent(index) {
  console.log('删除按钮点击，索引：', index);
  if (confirm('确定删除该学员？')) {
    try {
      await saveData('students', 'DELETE', { index });
      await renderStudents();
    } catch (error) {
      console.error('删除学员失败:', error);
      alert('删除学员失败，请检查网络！');
    }
  }
}

// 导出数据
async function exportData() {
  console.log('导出数据按钮点击');
  try {
    const students = await fetchData('students');
    const trainingRecords = await fetchData('trainingRecords');

    // 导出 students.csv
    const studentHeaders = ['姓名', '身份证号码', '科目二状态', '科目三状态', '车型', '备注', '静态学时', '动态学时'];
    const studentRows = students.map(s => [
      `"${s.name}"`,
      `"${s.idCard}"`,
      `"${s.subject2Pass ? '合格' : '未合格'}"`,
      `"${s.subject3Status}"`,
      `"${s.vehicleType}"`,
      `"${s.remarks || ''}"`,
      s.staticHours,
      s.dynamicHours
    ]);
    const studentCsv = '\ufeff' + [studentHeaders, ...studentRows].map(row => row.join(',')).join('\n');
    downloadCsv(studentCsv, 'students.csv');

    // 导出 trainingRecords.csv
    const trainingHeaders = ['身份证号码', '练车日期', '开始时间', '结束时间', '练习时长', '需加强项目', '备注'];
    const trainingRows = trainingRecords.map(r => [
      `"${r.idCard}"`,
      `"${r.trainingDate}"`,
      `"${r.startTime}"`,
      `"${r.endTime}"`,
      r.duration,
      `"${r.weakItems.join(';')}"`,
      `"${r.remarks}"`
    ]);
    const trainingCsv = '\ufeff' + [trainingHeaders, ...trainingRows].map(row => row.join(',')).join('\n');
    downloadCsv(trainingCsv, 'trainingRecords.csv');
  } catch (error) {
    console.error('导出数据失败:', error);
    alert('导出数据失败，请检查网络！');
  }
}

// 下载 CSV 文件
function downloadCsv(csvContent, fileName) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

// 验证时间格式
function validateTimeFormat(time) {
  const times = generateTimeOptions();
  return times.includes(time);
}

// 导入数据
document.getElementById('importFile')?.addEventListener('change', async function (event) {
  console.log('导入文件选择');
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function (e) {
    const text = e.target.result;
    const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
    const headers = rows[0];
    const data = rows.slice(1).filter(row => row.length >= headers.length);

    try {
      if (headers.join(',') === ['姓名', '身份证号码', '科目二状态', '科目三状态', '车型', '备注', '静态学时', '动态学时'].join(',')) {
        const overwrite = confirm('导入学员数据，是否覆盖现有数据？（点击“取消”将追加数据）');
        const newStudents = data.map(row => ({
          name: row[0],
          idCard: row[1] || '待录入',
          subject2Pass: row[2] === '合格',
          subject3Status: ['练习中', '需补考', '已合格'].includes(row[3]) ? row[3] : '练习中',
          vehicleType: ['C1', 'C2'].includes(row[4]) ? row[4] : 'C1',
          remarks: row[5] || '',
          staticHours: isNaN(parseInt(row[6])) ? 0 : Math.max(0, parseInt(row[6])),
          dynamicHours: isNaN(parseInt(row[7])) ? 0 : Math.max(0, parseInt(row[7]))
        })).filter(s => s.name && (s.idCard === '待录入' || validateIdCard(s.idCard)));

        if (overwrite) {
          await saveData('students', 'POST', newStudents.filter(s => !students.some(existing => existing.idCard === s.idCard && s.idCard !== '待录入')));
        } else {
          for (const s of newStudents) {
            if (s.idCard !== '待录入' && !students.some(existing => existing.idCard === s.idCard)) {
              await saveData('students', 'POST', s);
            } else if (s.idCard === '待录入') {
              await saveData('students', 'POST', s);
            }
          }
        }
        await renderStudents();
      } else if (headers.join(',') === ['身份证号码', '练车日期', '开始时间', '结束时间', '练习时长', '需加强项目', '备注'].join(',')) {
        const validWeakItems = ['超车', '直线行驶', '会车', '靠边停车', '换挡'];
        const overwrite = confirm('导入学时记录，是否覆盖现有数据？（点击“取消”将追加数据）');
        const newRecords = data.map(row => ({
          idCard: row[0] || '待录入',
          trainingDate: row[1],
          startTime: row[2],
          endTime: row[3],
          duration: parseInt(row[4]),
          weakItems: row[5] ? row[5].split(';').filter(item => validWeakItems.includes(item)) : [],
          remarks: row[6] || ''
        })).filter(r => 
          r.idCard && (r.idCard === '待录入' || validateIdCard(r.idCard)) &&
          r.trainingDate && validateTimeFormat(r.startTime) && validateTimeFormat(r.endTime) &&
          !isNaN(r.duration) && r.duration >= 30 && r.duration % 30 === 0 &&
          calculateDuration(r.startTime, r.endTime) === r.duration
        );

        if (overwrite) {
          await saveData('trainingRecords', 'POST', newRecords);
        } else {
          for (const r of newRecords) {
            if (!trainingRecords.some(existing => existing.idCard === r.idCard && existing.trainingDate === r.trainingDate && existing.startTime === r.startTime)) {
              await saveData('trainingRecords', 'POST', r);
            }
          }
        }
        await renderTrainingRecords();
      } else {
        alert('无效的CSV文件格式！');
      }
    } catch (error) {
      console.error('导入数据失败:', error);
      alert('导入数据失败，请检查网络或文件格式！');
    }
  };
  reader.readAsText(file, 'UTF-8');
});

// 查看学时记录
function viewTraining(index) {
  console.log('查看学时按钮点击，索引：', index);
  currentStudentId = students[index].idCard;
  window.location.href = `training.html?idCard=${currentStudentId}`;
}

// 渲染学时记录
async function renderTrainingRecords() {
  const tbody = document.getElementById('trainingTable');
  if (!tbody) return;

  const urlParams = new URLSearchParams(window.location.search);
  const idCard = urlParams.get('idCard');
  if (!idCard) {
    alert('请先选择学员！');
    window.location.href = 'index.html';
    return;
  }
  try {
    students = await fetchData('students');
    trainingRecords = await fetchData('trainingRecords');
    const student = students.find(s => s.idCard === idCard);
    if (student) {
      document.getElementById('studentName').textContent = student.name || '未知';
      document.getElementById('studentIdCard').textContent = student.idCard || '待录入';
      document.getElementById('staticHours').textContent = student.staticHours || 0;
      document.getElementById('dynamicHours').textContent = student.dynamicHours || 0;
      const totalTrainingHours = trainingRecords
        .filter(r => r.idCard === idCard)
        .reduce((sum, r) => sum + r.duration, 0);
      document.getElementById('totalTrainingHours').textContent = totalTrainingHours;
    } else {
      alert('学员不存在！');
      window.location.href = 'index.html';
      return;
    }

    tbody.innerHTML = '';
    trainingRecords
      .filter(r => r.idCard === idCard)
      .forEach((record, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${record.trainingDate}</td>
          <td>${record.startTime}</td>
          <td>${record.endTime}</td>
          <td>${record.duration}</td>
          <td>${record.weakItems.join(', ')}</td>
          <td>${record.remarks}</td>
          <td>
            <button class="btn btn-warning btn-sm" onclick="openEditTrainingModal(${index})">编辑</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTraining(${index})">删除</button>
          </td>
        `;
        tbody.appendChild(row);
      });
  } catch (error) {
    console.error('渲染学时记录失败:', error);
    alert('无法加载学时记录，请检查网络！');
  }
}

// 打开添加学时记录模态框
function openAddTrainingModal() {
  console.log('添加学时记录按钮点击');
  editTrainingIndex = null;
  document.getElementById('trainingModalTitle').textContent = '添加学时记录';
  document.getElementById('trainingForm').reset();
  document.getElementById('trainingDate').value = '';
  populateTimeSelects();
  document.getElementById('startTime').value = '';
  document.getElementById('endTime').value = '';
  document.getElementById('weakItem1').checked = false;
  document.getElementById('weakItem2').checked = false;
  document.getElementById('weakItem3').checked = false;
  document.getElementById('weakItem4').checked = false;
  document.getElementById('weakItem5').checked = false;
  document.getElementById('remarks').value = '';
  new bootstrap.Modal(document.getElementById('trainingModal')).show();
}

// 打开编辑学时记录模态框
function openEditTrainingModal(index) {
  console.log('编辑学时记录按钮点击，索引：', index);
  editTrainingIndex = index;
  const record = trainingRecords[index];
  document.getElementById('trainingModalTitle').textContent = '编辑学时记录';
  document.getElementById('trainingDate').value = record.trainingDate;
  populateTimeSelects();
  document.getElementById('startTime').value = record.startTime;
  document.getElementById('endTime').value = record.endTime;
  document.getElementById('weakItem1').checked = record.weakItems.includes('超车');
  document.getElementById('weakItem2').checked = record.weakItems.includes('直线行驶');
  document.getElementById('weakItem3').checked = record.weakItems.includes('会车');
  document.getElementById('weakItem4').checked = record.weakItems.includes('靠边停车');
  document.getElementById('weakItem5').checked = record.weakItems.includes('换挡');
  document.getElementById('remarks').value = record.remarks;
  new bootstrap.Modal(document.getElementById('trainingModal')).show();
}

// 保存学时记录
async function saveTraining() {
  console.log('保存学时记录按钮点击');
  const urlParams = new URLSearchParams(window.location.search);
  const idCard = urlParams.get('idCard');
  const trainingDate = document.getElementById('trainingDate').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const weakItems = [
    document.getElementById('weakItem1').checked ? '超车' : '',
    document.getElementById('weakItem2').checked ? '直线行驶' : '',
    document.getElementById('weakItem3').checked ? '会车' : '',
    document.getElementById('weakItem4').checked ? '靠边停车' : '',
    document.getElementById('weakItem5').checked ? '换挡' : '',
  ].filter(item => item);
  const remarks = document.getElementById('remarks').value;

  if (!trainingDate || !startTime || !endTime) {
    alert('请填写所有必填字段！');
    return;
  }

  const duration = calculateDuration(startTime, endTime);
  if (!duration) {
    alert('结束时间必须晚于开始时间，且练习时长必须为30分钟的倍数！');
    return;
  }

  const record = {
    idCard,
    trainingDate,
    startTime,
    endTime,
    duration,
    weakItems,
    remarks,
  };

  try {
    if (editTrainingIndex === null) {
      await saveData('trainingRecords', 'POST', record);
    } else {
      await saveData('trainingRecords', 'PUT', { index: editTrainingIndex, record });
    }
    await renderTrainingRecords();
    bootstrap.Modal.getInstance(document.getElementById('trainingModal')).hide();
  } catch (error) {
    console.error('保存学时记录失败:', error);
    alert('保存学时记录失败，请检查网络！');
  }
}

// 删除学时记录
async function deleteTraining(index) {
  console.log('删除学时记录按钮点击，索引：', index);
  if (confirm('确定删除该学时记录？')) {
    try {
      await saveData('trainingRecords', 'DELETE', { index });
      await renderTrainingRecords();
    } catch (error) {
      console.error('删除学时记录失败:', error);
      alert('删除学时记录失败，请检查网络！');
    }
  }
}

// 页面加载时初始化
window.onload = async function () {
  console.log('页面加载完成，初始化渲染');
  try {
    await renderStudents();
    await renderTrainingRecords();
  } catch (error) {
    console.error('初始化失败:', error);
    alert('页面初始化失败，请检查网络！');
  }
};