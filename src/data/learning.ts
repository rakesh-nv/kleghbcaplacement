// Skill-development content. Resource links point to real, free public learning sites.
import type { LearningPath, LearningResource, Quiz, QuizQuestion } from '@/types/models'

const T = '2026-01-01T00:00:00.000Z'

const r = (id: string, title: string, url: string, category: string, skill_tags: string[], resource_type: LearningResource['resource_type'], difficulty: LearningResource['difficulty'], description: string): LearningResource =>
  ({ id, title, url, category, skill_tags, resource_type, difficulty, description, is_free: true, created_at: T })

export const RESOURCES: LearningResource[] = [
  r('res_py1', 'Python for Everybody', 'https://www.py4e.com/', 'Programming', ['Python'], 'course', 'beginner', 'Free university-level introduction to Python.'),
  r('res_java1', 'Java Tutorial (W3Schools)', 'https://www.w3schools.com/java/', 'Programming', ['Java', 'OOP'], 'article', 'beginner', 'Interactive Java basics with examples.'),
  r('res_c1', 'C Programming (GeeksforGeeks)', 'https://www.geeksforgeeks.org/c-programming-language/', 'Programming', ['C'], 'article', 'beginner', 'C language concepts with examples.'),
  r('res_js1', 'JavaScript Guide (MDN)', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', 'Web Development', ['JavaScript'], 'article', 'intermediate', 'The definitive JavaScript reference and guide.'),
  r('res_web1', 'Responsive Web Design (freeCodeCamp)', 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', 'Web Development', ['HTML', 'CSS'], 'course', 'beginner', 'Hands-on HTML and CSS certification course.'),
  r('res_react1', 'React – Quick Start', 'https://react.dev/learn', 'Web Development', ['React', 'JavaScript'], 'article', 'intermediate', 'Official React learning path.'),
  r('res_node1', 'Node.js – Introduction', 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs', 'Web Development', ['Node.js', 'Express'], 'article', 'intermediate', 'Official Node.js learning guide.'),
  r('res_sql1', 'SQL Tutorial (SQLBolt)', 'https://sqlbolt.com/', 'Databases', ['SQL', 'MySQL', 'PostgreSQL'], 'practice', 'beginner', 'Interactive SQL lessons and exercises.'),
  r('res_dbms1', 'DBMS (GeeksforGeeks)', 'https://www.geeksforgeeks.org/dbms/', 'Databases', ['DBMS', 'SQL'], 'article', 'intermediate', 'Normalization, transactions, indexing and more.'),
  r('res_mongo1', 'MongoDB University', 'https://learn.mongodb.com/', 'Databases', ['MongoDB'], 'course', 'intermediate', 'Free official MongoDB courses.'),
  r('res_dsa1', 'DSA Self-Paced Topics (GeeksforGeeks)', 'https://www.geeksforgeeks.org/learn-data-structures-and-algorithms-dsa-tutorial/', 'Data Structures', ['Data Structures', 'Algorithms'], 'article', 'intermediate', 'Arrays, linked lists, trees, graphs, sorting.'),
  r('res_dsa2', 'LeetCode – Problem Set', 'https://leetcode.com/problemset/', 'Data Structures', ['Data Structures', 'Algorithms'], 'practice', 'advanced', 'Coding interview practice problems.'),
  r('res_dsa3', 'HackerRank – Practice', 'https://www.hackerrank.com/domains', 'Data Structures', ['Algorithms', 'Python', 'Java', 'SQL'], 'practice', 'intermediate', 'Practice tracks across languages and SQL.'),
  r('res_apt1', 'IndiaBix – Aptitude', 'https://www.indiabix.com/aptitude/questions-and-answers/', 'Aptitude', ['Aptitude'], 'practice', 'beginner', 'Quantitative aptitude questions with solutions.'),
  r('res_apt2', 'IndiaBix – Logical Reasoning', 'https://www.indiabix.com/logical-reasoning/questions-and-answers/', 'Aptitude', ['Aptitude', 'Problem Solving'], 'practice', 'beginner', 'Logical reasoning practice.'),
  r('res_comm1', 'Business English (BBC Learning English)', 'https://www.bbc.co.uk/learningenglish/', 'Communication', ['Communication'], 'course', 'beginner', 'Improve spoken and written English.'),
  r('res_comm2', 'Interview Skills (Khan Academy)', 'https://www.khanacademy.org/college-careers-more/career-content', 'Interview Preparation', ['Communication'], 'video', 'beginner', 'Career and interview preparation videos.'),
  r('res_git1', 'Git Handbook (GitHub Docs)', 'https://docs.github.com/en/get-started/using-git/about-git', 'Programming', ['Git', 'GitHub'], 'article', 'beginner', 'Version control fundamentals.'),
  r('res_excel1', 'Excel Training (Microsoft)', 'https://support.microsoft.com/en-us/excel', 'Professional', ['Excel', 'Data Analysis'], 'course', 'beginner', 'Official Excel training.'),
  r('res_tally1', 'NPTEL – Accounting Courses', 'https://nptel.ac.in/courses', 'Professional', ['Accounting', 'Finance', 'Tally'], 'course', 'intermediate', 'Free NPTEL courses including accounting and finance.'),
  r('res_ml1', 'Machine Learning Crash Course (Google)', 'https://developers.google.com/machine-learning/crash-course', 'Programming', ['Machine Learning', 'Python'], 'course', 'advanced', 'Google’s free ML introduction.'),
  r('res_int1', 'Tech Interview Handbook', 'https://www.techinterviewhandbook.org/', 'Interview Preparation', ['Algorithms', 'Communication'], 'article', 'intermediate', 'Free guide to technical interviews.'),
]

const p = (id: string, title: string, category: string, skill_tags: string[], resources: string[], difficulty: LearningPath['difficulty'], estimated_hours: number, description: string): LearningPath =>
  ({ id, title, category, skill_tags, resources, difficulty, estimated_hours, description, created_at: T })

export const PATHS: LearningPath[] = [
  p('path_prog', 'Programming Fundamentals', 'Programming', ['C', 'Java', 'Python', 'OOP', 'Git'], ['res_c1', 'res_py1', 'res_java1', 'res_git1'], 'beginner', 40, 'Core programming concepts, OOP and version control.'),
  p('path_web', 'Full-Stack Web Development', 'Web Development', ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Express'], ['res_web1', 'res_js1', 'res_react1', 'res_node1'], 'intermediate', 60, 'From HTML/CSS to React front ends and Node.js APIs.'),
  p('path_db', 'Databases & SQL', 'Databases', ['SQL', 'MySQL', 'PostgreSQL', 'DBMS', 'MongoDB'], ['res_sql1', 'res_dbms1', 'res_mongo1'], 'beginner', 25, 'Relational modelling, SQL queries and NoSQL basics.'),
  p('path_dsa', 'Data Structures & Algorithms', 'Data Structures', ['Data Structures', 'Algorithms'], ['res_dsa1', 'res_dsa3', 'res_dsa2'], 'intermediate', 80, 'The foundation for technical interview rounds.'),
  p('path_apt', 'Aptitude & Reasoning', 'Aptitude', ['Aptitude', 'Problem Solving'], ['res_apt1', 'res_apt2'], 'beginner', 30, 'Quantitative aptitude and logical reasoning for written tests.'),
  p('path_comm', 'Communication Skills', 'Communication', ['Communication', 'Teamwork', 'Leadership'], ['res_comm1', 'res_comm2'], 'beginner', 20, 'Spoken English, group discussion and presentation.'),
  p('path_int', 'Interview Preparation', 'Interview Preparation', ['Communication', 'Algorithms'], ['res_int1', 'res_comm2', 'res_dsa2'], 'intermediate', 25, 'HR and technical interview readiness.'),
  p('path_biz', 'Commerce & Business Tools', 'Professional', ['Excel', 'Accounting', 'Tally', 'Finance', 'Data Analysis'], ['res_excel1', 'res_tally1'], 'beginner', 30, 'Excel, accounting and finance tools used by recruiters.'),
]

const q = (id: string, title: string, category: string, difficulty: Quiz['difficulty'], time_limit_minutes: number, description: string): Quiz =>
  ({ id, title, category, difficulty, time_limit_minutes, description, passing_score: 60, is_active: true, created_at: T })

export const QUIZZES: Quiz[] = [
  q('quiz_apt', 'Quantitative Aptitude – Set 1', 'Aptitude', 'easy', 10, 'Percentages, ratios, time & work.'),
  q('quiz_logic', 'Logical Reasoning – Set 1', 'Aptitude', 'medium', 10, 'Series, coding-decoding, directions.'),
  q('quiz_prog', 'Programming Basics', 'Programming', 'easy', 8, 'Core concepts across C, Java and Python.'),
  q('quiz_db', 'DBMS & SQL', 'Databases', 'medium', 8, 'Keys, normalization and queries.'),
  q('quiz_web', 'Web Development Basics', 'Web Development', 'easy', 8, 'HTML, CSS, JavaScript and HTTP.'),
  q('quiz_dsa', 'Data Structures', 'Data Structures', 'medium', 10, 'Complexity, stacks, queues, trees.'),
]

let n = 0
const qq = (quiz_id: string, question: string, options: string[], correct_option: number, explanation: string): QuizQuestion =>
  ({ id: `qq_${++n}`, quiz_id, question, options, correct_option, explanation, points: 1, created_at: T })

export const QUESTIONS: QuizQuestion[] = [
  qq('quiz_apt', 'A price rises from ₹400 to ₹500. What is the percentage increase?', ['20%', '25%', '30%', '15%'], 1, 'Increase = 100; 100/400 × 100 = 25%.'),
  qq('quiz_apt', 'A can finish a job in 10 days and B in 15 days. Working together, how many days?', ['5', '6', '7.5', '8'], 1, 'Combined rate = 1/10 + 1/15 = 1/6, so 6 days.'),
  qq('quiz_apt', 'The ratio of boys to girls is 3:2 in a class of 40. How many girls?', ['12', '16', '18', '24'], 1, '2/5 × 40 = 16.'),
  qq('quiz_apt', 'A train 150 m long passes a pole in 15 s. Its speed in km/h?', ['36', '40', '45', '54'], 0, '150/15 = 10 m/s = 36 km/h.'),
  qq('quiz_apt', 'Simple interest on ₹2000 at 5% per annum for 3 years?', ['₹250', '₹300', '₹350', '₹400'], 1, '2000 × 5 × 3 / 100 = 300.'),
  qq('quiz_apt', 'Average of 10, 20, 30, 40, 50?', ['25', '30', '35', '40'], 1, 'Sum 150 / 5 = 30.'),
  qq('quiz_logic', 'Next in series: 2, 6, 12, 20, 30, ?', ['40', '42', '44', '36'], 1, 'Differences 4, 6, 8, 10, 12 → 42.'),
  qq('quiz_logic', 'If CAT is coded DBU, how is DOG coded?', ['EPH', 'EPI', 'FPH', 'DPH'], 0, 'Each letter shifts +1.'),
  qq('quiz_logic', 'Ravi walks 5 km north, turns right and walks 3 km. Which direction is he from start?', ['North-East', 'North-West', 'South-East', 'East'], 0, 'North then east → north-east.'),
  qq('quiz_logic', 'Odd one out: Apple, Mango, Carrot, Banana', ['Apple', 'Mango', 'Carrot', 'Banana'], 2, 'Carrot is a vegetable.'),
  qq('quiz_logic', 'All roses are flowers. Some flowers fade quickly. Therefore:', ['All roses fade quickly', 'Some roses fade quickly', 'No conclusion about roses fading follows', 'No rose fades'], 2, 'The premises do not link roses to fading.'),
  qq('quiz_prog', 'Which of these is not an OOP principle?', ['Encapsulation', 'Polymorphism', 'Compilation', 'Inheritance'], 2, 'Compilation is a build step, not an OOP principle.'),
  qq('quiz_prog', 'In Python, what does len([1, 2, 3]) return?', ['2', '3', '4', 'Error'], 1, 'The list has three elements.'),
  qq('quiz_prog', 'Which keyword creates an object in Java?', ['class', 'new', 'this', 'create'], 1, '`new` allocates an instance.'),
  qq('quiz_prog', 'In C, which operator gives the address of a variable?', ['*', '&', '->', '#'], 1, '`&x` is the address of x.'),
  qq('quiz_prog', 'What is the output of 7 // 2 in Python?', ['3.5', '3', '4', '1'], 1, '`//` is floor division.'),
  qq('quiz_db', 'Which key uniquely identifies each row in a table?', ['Foreign key', 'Primary key', 'Candidate key only', 'Composite attribute'], 1, 'The primary key is unique and not null.'),
  qq('quiz_db', 'Which SQL clause filters groups after aggregation?', ['WHERE', 'HAVING', 'ORDER BY', 'GROUP BY'], 1, 'HAVING filters aggregated groups.'),
  qq('quiz_db', '2NF removes which kind of dependency?', ['Transitive', 'Partial', 'Multivalued', 'Join'], 1, '2NF removes partial dependency on a composite key.'),
  qq('quiz_db', 'Which command removes all rows but keeps the table structure?', ['DROP', 'DELETE TABLE', 'TRUNCATE', 'ALTER'], 2, 'TRUNCATE empties the table.'),
  qq('quiz_db', 'ACID: what does the “I” stand for?', ['Integrity', 'Isolation', 'Indexing', 'Inheritance'], 1, 'Isolation between concurrent transactions.'),
  qq('quiz_web', 'Which HTML tag creates a hyperlink?', ['<link>', '<a>', '<href>', '<url>'], 1, 'The anchor tag `<a href>`.'),
  qq('quiz_web', 'Which CSS property sets text colour?', ['font-color', 'text-color', 'color', 'foreground'], 2, '`color` sets text colour.'),
  qq('quiz_web', 'Which HTTP status code means “Not Found”?', ['200', '301', '404', '500'], 2, '404 Not Found.'),
  qq('quiz_web', 'Which method converts a JSON string to a JS object?', ['JSON.stringify', 'JSON.parse', 'JSON.toObject', 'Object.json'], 1, '`JSON.parse`.'),
  qq('quiz_web', 'In React, data passed from parent to child is called:', ['state', 'props', 'hooks', 'refs'], 1, 'Props flow down from parent.'),
  qq('quiz_dsa', 'Time complexity of binary search on a sorted array?', ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 1, 'The search space halves each step.'),
  qq('quiz_dsa', 'Which structure follows LIFO?', ['Queue', 'Stack', 'Heap', 'Graph'], 1, 'Stack is last-in first-out.'),
  qq('quiz_dsa', 'In-order traversal of a BST gives:', ['Random order', 'Sorted order', 'Reverse insertion order', 'Level order'], 1, 'In-order on a BST is sorted.'),
  qq('quiz_dsa', 'Which sorting algorithm has worst case O(n log n)?', ['Quick sort', 'Bubble sort', 'Merge sort', 'Insertion sort'], 2, 'Merge sort is O(n log n) in all cases.'),
  qq('quiz_dsa', 'A queue is best implemented for BFS because BFS is:', ['Depth-first', 'Level-order', 'Recursive only', 'Greedy'], 1, 'BFS visits nodes level by level (FIFO).'),
]

export const INTERVIEW_QUESTIONS: Array<{ category: string; question: string; tip: string }> = [
  { category: 'HR', question: 'Tell me about yourself.', tip: 'Two minutes: education → key projects/skills → why this role. Avoid repeating the resume line by line.' },
  { category: 'HR', question: 'Why should we hire you?', tip: 'Match two or three of your strengths to the job description with a concrete example each.' },
  { category: 'HR', question: 'What are your strengths and weaknesses?', tip: 'Name a real weakness and what you are doing to improve it.' },
  { category: 'HR', question: 'Where do you see yourself in five years?', tip: 'Show growth within the domain; avoid naming unrelated goals.' },
  { category: 'HR', question: 'Are you willing to relocate?', tip: 'Answer honestly; recruiters note this for posting decisions.' },
  { category: 'Technical', question: 'Explain the difference between an abstract class and an interface.', tip: 'Cover multiple inheritance, default methods and when you would choose each.' },
  { category: 'Technical', question: 'What is normalization? Explain 1NF, 2NF and 3NF.', tip: 'Use a small student–course table example.' },
  { category: 'Technical', question: 'What happens when you type a URL into a browser?', tip: 'DNS → TCP/TLS → HTTP request → server → response → rendering.' },
  { category: 'Technical', question: 'Reverse a linked list.', tip: 'Explain the three-pointer iterative approach and its O(n) time, O(1) space.' },
  { category: 'Technical', question: 'Difference between SQL JOIN types.', tip: 'Inner, left, right, full outer — draw the Venn idea and give a query.' },
  { category: 'Technical', question: 'What is the virtual DOM in React?', tip: 'Explain diffing and why it reduces direct DOM updates.' },
  { category: 'Commerce', question: 'Explain the golden rules of accounting.', tip: 'Personal, real and nominal accounts with one example each.' },
  { category: 'Commerce', question: 'What is GST and what are CGST, SGST and IGST?', tip: 'Intra-state vs inter-state supply.' },
  { category: 'Commerce', question: 'What is working capital?', tip: 'Current assets minus current liabilities; why it matters.' },
]
