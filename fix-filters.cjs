const fs = require('fs');

let c = fs.readFileSync('src/pages/Courses.tsx', 'utf8');

c = c.replace(/filterDept/g, 'filterCategory');
c = c.replace(/All Departments/g, 'All Categories');
c = c.replace(/department_id === filterCategory/g, 'category === filterCategory');
c = c.replace(/\{?departments\.map\(d => \([\s\S]*?\)[\s\S]*?(<\/select>)/, `
              <option value="core">Core Course</option>
              <option value="technical">Technical / Coding</option>
              <option value="soft_skills">Soft Skills</option>
              <option value="aptitude">Aptitude</option>
              <option value="other">Other</option>
            $1`);

fs.writeFileSync('src/pages/Courses.tsx', c);

let d = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

d = d.replace(/filterDept/g, 'filterCategory');
d = d.replace(/All Departments/g, 'All Categories');
d = d.replace(/department_id === filterCategory/g, 'category === filterCategory');
d = d.replace(/\{?departments\.map\(d => \([\s\S]*?\)[\s\S]*?(<\/select>)/, `
              <option value="core">Core Course</option>
              <option value="technical">Technical / Coding</option>
              <option value="soft_skills">Soft Skills</option>
              <option value="aptitude">Aptitude</option>
              <option value="other">Other</option>
            $1`);

fs.writeFileSync('src/pages/Dashboard.tsx', d);
