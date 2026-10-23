import { mkdir, cp } from 'node:fs/promises';
// 所有资源使用相对路径，适配 GitHub Pages 的任意仓库子路径。
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'src', 'assets']) await cp(path, `dist/${path}`, { recursive: true });
console.log('构建完成：dist/ 可直接部署到静态托管。');
