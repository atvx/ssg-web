const fs = require('fs');
const path = require('path');

// 递归查找目录中的所有.tsx文件
function findTsxFiles(directory) {
  const files = [];
  const items = fs.readdirSync(directory);
  
  for (const item of items) {
    const fullPath = path.join(directory, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTsxFiles(fullPath));
    } else if (item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 更新文件内容
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 替换路由路径
    if (content.includes('router.push(\'/auth/login\')') || content.includes('router.push("/auth/login")')) {
      content = content.replace(/router\.push\(['"]\/auth\/login['"]\)/g, 'router.push(\'/login\')');
      modified = true;
    }
    
    if (content.includes('router.push(\'/dashboard\')') || content.includes('router.push("/dashboard")')) {
      content = content.replace(/router\.push\(['"]\/dashboard['"]\)/g, 'router.push(\'/\')');
      modified = true;
    }

    if (content.includes('window.location.href = \'/auth/login\'') || content.includes('window.location.href = "/auth/login"')) {
      content = content.replace(/window\.location\.href = ['"]\/auth\/login['"]/g, 'window.location.href = \'/login\'');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}: ${error.message}`);
  }
}

// 主函数
function main() {
  const pagesDir = path.join(__dirname, 'pages');
  const files = findTsxFiles(pagesDir);
  
  let totalUpdated = 0;
  for (const file of files) {
    updateFile(file);
  }
  
  console.log('Update complete!');
}

main(); 