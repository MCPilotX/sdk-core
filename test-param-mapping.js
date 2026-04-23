/**
 * Test parameter mapping logic
 */

console.log('=== 测试参数映射逻辑 ===\n');

// 模拟工具参数schema
const toolSchema = {
  from_station: { type: 'string', description: '出发站' },
  to_station: { type: 'string', description: '到达站' },
  date: { type: 'string', description: '出发日期' }
};

// 模拟LLM解析出的参数
const intentParams = {
  'fromStation': '广州',
  'toStation': '长沙',
  'date': '2026-05-01'
};

console.log('工具参数schema:', Object.keys(toolSchema));
console.log('LLM解析参数:', intentParams);
console.log('\n参数映射过程:');

// 测试直接匹配
console.log('\n1. 直接匹配测试:');
for (const [intentKey, intentValue] of Object.entries(intentParams)) {
  if (toolSchema[intentKey]) {
    console.log(`   ✓ "${intentKey}" -> "${intentKey}" (直接匹配)`);
  }
}

// 测试规范化匹配（忽略大小写和分隔符）
console.log('\n2. 规范化匹配测试:');
for (const [intentKey, intentValue] of Object.entries(intentParams)) {
  const intentKeyLower = intentKey.toLowerCase().replace(/[_-]/g, '');
  let mapped = false;
  
  for (const schemaKey of Object.keys(toolSchema)) {
    const schemaKeyLower = schemaKey.toLowerCase().replace(/[_-]/g, '');
    if (intentKeyLower === schemaKeyLower) {
      console.log(`   ✓ "${intentKey}" -> "${schemaKey}" (规范化匹配)`);
      mapped = true;
      break;
    }
  }
  
  if (!mapped) {
    console.log(`   ✗ "${intentKey}" 未找到匹配`);
  }
}

// 测试部分匹配
console.log('\n3. 部分匹配测试:');
for (const [intentKey, intentValue] of Object.entries(intentParams)) {
  const intentKeyLower = intentKey.toLowerCase();
  let mapped = false;
  
  for (const schemaKey of Object.keys(toolSchema)) {
    const schemaKeyLower = schemaKey.toLowerCase();
    if (intentKeyLower.includes(schemaKeyLower) || schemaKeyLower.includes(intentKeyLower)) {
      console.log(`   ✓ "${intentKey}" -> "${schemaKey}" (部分匹配)`);
      mapped = true;
      break;
    }
  }
  
  if (!mapped) {
    console.log(`   ✗ "${intentKey}" 未找到匹配`);
  }
}

console.log('\n=== 测试完成 ===');