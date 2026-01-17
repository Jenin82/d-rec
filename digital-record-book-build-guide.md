# Digital Record Book - Complete Build Guide

## Project Overview

### Purpose
A web-based digital record book system for college students to replace the traditional paper-based programming lab record submission process. The system streamlines the workflow from algorithm approval to code execution and final submission.

### Problem Statement
Currently, students must:
1. Write algorithms in physical books
2. Wait for teacher approval
3. Code the program after approval
4. Write the complete code and results back into the physical book

This is time-consuming and provides no assistance during the learning process.

### Solution
A digital platform where:
- Students write and submit algorithms digitally
- Teachers review and approve/reject with comments
- Students code in a web-based editor with real-time compilation
- AI provides code review and improvement suggestions
- Final submissions are stored digitally
- Complete record book can be downloaded as PDF

---

## System Architecture

### Tech Stack

#### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: shadcn/ui (already configured)
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **Styling**: Tailwind CSS
- **State Management**: React Context API / Zustand
- **PDF Generation**: jsPDF or react-pdf
- **Real-time Updates**: Supabase Realtime

#### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Code Execution**: Judge0 (Self-hosted)
- **AI Integration**: Anthropic Claude API

#### Infrastructure
- **Hosting**: Vercel (Frontend) + VPS (Judge0)
- **Database**: Supabase Cloud or Self-hosted PostgreSQL
- **Code Execution Server**: VPS/Cloud instance for Judge0

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  SuperAdmin  │  │    Admin     │  │   Teacher    │     │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────────────────────────────────────────┐     │
│  │         Student Interface                         │     │
│  │  - Algorithm Editor                               │     │
│  │  - Monaco Code Editor                             │     │
│  │  - Output Console                                 │     │
│  │  - AI Review Panel                                │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Next.js API Routes)               │
│  - Authentication & Authorization                           │
│  - Organization Management                                  │
│  - Classroom CRUD                                           │
│  - Program Assignment Management                            │
│  - Submission Workflows                                     │
│  - AI Code Review Integration                               │
│  - PDF Generation                                           │
└─────────────────────────────────────────────────────────────┘
            │                    │                    │
            ↓                    ↓                    ↓
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │  PostgreSQL  │    │   Judge0     │    │  Claude API  │
    │  (Supabase)  │    │ Self-hosted  │    │ (Anthropic)  │
    │              │    │              │    │              │
    │ - Users      │    │ - Compile    │    │ - Review     │
    │ - Orgs       │    │ - Execute    │    │ - Suggest    │
    │ - Programs   │    │ - Return     │    │ - Analyze    │
    │ - Submissions│    │              │    │              │
    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
SuperAdmin
    │
    ├── Can manage everything
    │
    └── Admin (per Organization)
            │
            ├── Can manage Teachers in their org
            ├── Can create Classrooms
            │
            └── Teacher (assigned to Classrooms)
                    │
                    ├── Can create Programs
                    ├── Can approve Algorithms
                    ├── Can evaluate Submissions
                    │
                    └── Student (enrolled in Classrooms)
                            │
                            ├── Can submit Algorithms
                            ├── Can write Code
                            └── Can submit final work
```

### Role Permissions Matrix

| Feature | SuperAdmin | Admin | Teacher | Student |
|---------|------------|-------|---------|---------|
| Manage Organizations | ✅ | ❌ | ❌ | ❌ |
| Create Admins | ✅ | ❌ | ❌ | ❌ |
| View All Organizations | ✅ | ❌ | ❌ | ❌ |
| Manage Teachers | ✅ | ✅ (own org) | ❌ | ❌ |
| Create Classrooms | ✅ | ✅ (own org) | ❌ | ❌ |
| Manage Students | ✅ | ✅ (own org) | ✅ (own classes) | ❌ |
| Create Programs | ✅ | ✅ | ✅ (own classes) | ❌ |
| Approve Algorithms | ✅ | ✅ | ✅ (own classes) | ❌ |
| Evaluate Submissions | ✅ | ✅ | ✅ (own classes) | ❌ |
| Submit Algorithms | ❌ | ❌ | ❌ | ✅ |
| Write Code | ❌ | ❌ | ❌ | ✅ |
| Get AI Review | ❌ | ❌ | ❌ | ✅ |
| Download PDF | ✅ | ✅ | ✅ | ✅ |

---

## Database Schema

### Core Tables

```sql
-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'teacher', 'student');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Index for faster role-based queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- ORGANIZATIONS
-- ============================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "MIT", "STANFORD"
    description TEXT,
    logo_url TEXT,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organizations_code ON organizations(code);
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- ============================================
-- ORGANIZATION MEMBERSHIPS
-- ============================================

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- ============================================
-- CLASSROOMS
-- ============================================

CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "CS101 - Fall 2024"
    code VARCHAR(50) NOT NULL, -- e.g., "CS101-F24-A"
    description TEXT,
    subject VARCHAR(100), -- e.g., "Data Structures"
    semester VARCHAR(50), -- e.g., "Fall 2024"
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_classrooms_org ON classrooms(organization_id);
CREATE INDEX idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX idx_classrooms_active ON classrooms(is_active);

-- ============================================
-- CLASSROOM ENROLLMENTS
-- ============================================

CREATE TABLE classroom_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(classroom_id, student_id)
);

CREATE INDEX idx_enrollments_classroom ON classroom_enrollments(classroom_id);
CREATE INDEX idx_enrollments_student ON classroom_enrollments(student_id);

-- ============================================
-- PROGRAMS (Assignments)
-- ============================================

CREATE TYPE programming_language AS ENUM ('python', 'c', 'cpp', 'java', 'javascript');

CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    language programming_language NOT NULL,
    difficulty_level VARCHAR(20), -- 'easy', 'medium', 'hard'
    
    -- Test cases (JSON array)
    test_cases JSONB, -- [{ input: "...", expected_output: "..." }]
    
    -- Starter code (optional)
    starter_code TEXT,
    
    -- Order in the classroom
    order_index INTEGER,
    
    -- Dates
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_programs_classroom ON programs(classroom_id);
CREATE INDEX idx_programs_language ON programs(language);
CREATE INDEX idx_programs_order ON programs(classroom_id, order_index);

-- ============================================
-- SUBMISSIONS
-- ============================================

CREATE TYPE submission_status AS ENUM (
    'algorithm_draft',
    'algorithm_submitted',
    'algorithm_approved',
    'algorithm_rejected',
    'code_in_progress',
    'code_submitted',
    'code_evaluated',
    'completed'
);

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Algorithm Section
    algorithm_text TEXT,
    algorithm_submitted_at TIMESTAMP WITH TIME ZONE,
    algorithm_approved_at TIMESTAMP WITH TIME ZONE,
    algorithm_approved_by UUID REFERENCES users(id),
    algorithm_feedback TEXT,
    
    -- Code Section
    code TEXT,
    code_output TEXT,
    execution_time FLOAT, -- in seconds
    memory_used INTEGER, -- in KB
    
    -- AI Review
    ai_review_text TEXT,
    ai_review_score INTEGER, -- 1-10
    ai_reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Teacher Evaluation
    teacher_feedback TEXT,
    grade DECIMAL(5,2), -- e.g., 95.50
    evaluated_at TIMESTAMP WITH TIME ZONE,
    evaluated_by UUID REFERENCES users(id),
    
    -- Status & Timestamps
    status submission_status DEFAULT 'algorithm_draft',
    submitted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(program_id, student_id)
);

CREATE INDEX idx_submissions_program ON submissions(program_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- ============================================
-- SUBMISSION VERSION HISTORY
-- ============================================

CREATE TYPE version_type AS ENUM ('algorithm', 'code');

CREATE TABLE submission_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    version_type version_type NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_versions_submission ON submission_versions(submission_id);
CREATE INDEX idx_versions_type ON submission_versions(version_type);

-- ============================================
-- CODE EXECUTION LOGS
-- ============================================

CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    code TEXT NOT NULL,
    language programming_language NOT NULL,
    
    -- Judge0 response
    judge0_token VARCHAR(100),
    stdout TEXT,
    stderr TEXT,
    compile_output TEXT,
    status_description VARCHAR(100),
    
    execution_time FLOAT,
    memory_used INTEGER,
    
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_execution_logs_submission ON execution_logs(submission_id);
CREATE INDEX idx_execution_logs_student ON execution_logs(student_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TYPE notification_type AS ENUM (
    'algorithm_submitted',
    'algorithm_approved',
    'algorithm_rejected',
    'code_submitted',
    'code_evaluated',
    'program_assigned'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link TEXT, -- URL to relevant page
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

-- ============================================
-- ACTIVITY LOGS (Audit Trail)
-- ============================================

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'created_program', 'approved_algorithm', etc.
    entity_type VARCHAR(50), -- 'program', 'submission', 'classroom'
    entity_id UUID,
    metadata JSONB, -- Additional context
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- SuperAdmin can see everything
CREATE POLICY "SuperAdmins have full access"
ON organizations FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'superadmin'
    )
);

-- Admins can see their organization
CREATE POLICY "Admins can view their organization"
ON organizations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_members.organization_id = organizations.id 
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'teacher')
    )
);

-- Students can see their submissions
CREATE POLICY "Students can view their own submissions"
ON submissions FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Teachers can see submissions in their classrooms
CREATE POLICY "Teachers can view classroom submissions"
ON submissions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM programs p
        JOIN classrooms c ON p.classroom_id = c.id
        WHERE p.id = submissions.program_id
        AND c.teacher_id = auth.uid()
    )
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification when algorithm is submitted
CREATE OR REPLACE FUNCTION notify_teacher_algorithm_submitted()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'algorithm_submitted' AND OLD.status = 'algorithm_draft' THEN
        INSERT INTO notifications (user_id, type, title, message, link)
        SELECT 
            c.teacher_id,
            'algorithm_submitted',
            'New Algorithm Submitted',
            u.name || ' submitted algorithm for ' || p.title,
            '/classroom/' || c.id || '/program/' || p.id || '/submission/' || NEW.id
        FROM programs p
        JOIN classrooms c ON p.classroom_id = c.id
        JOIN users u ON u.id = NEW.student_id
        WHERE p.id = NEW.program_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_algorithm_submitted
AFTER UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION notify_teacher_algorithm_submitted();
```

---

## API Endpoints Specification

### Authentication

```
POST   /api/auth/signup              - Register new user
POST   /api/auth/login               - Login
POST   /api/auth/logout              - Logout
GET    /api/auth/me                  - Get current user
PUT    /api/auth/profile             - Update profile
```

### Organizations (SuperAdmin only)

```
GET    /api/organizations            - List all organizations
POST   /api/organizations            - Create organization
GET    /api/organizations/:id        - Get organization details
PUT    /api/organizations/:id        - Update organization
DELETE /api/organizations/:id        - Delete organization
GET    /api/organizations/:id/stats  - Get organization statistics
```

### Admins (SuperAdmin only)

```
GET    /api/admins                   - List all admins
POST   /api/admins                   - Create admin for organization
PUT    /api/admins/:id               - Update admin
DELETE /api/admins/:id               - Remove admin
GET    /api/organizations/:orgId/admins - Get admins for organization
```

### Teachers

```
GET    /api/teachers                 - List teachers (filtered by org for admins)
POST   /api/teachers                 - Create teacher (Admin only)
PUT    /api/teachers/:id             - Update teacher
DELETE /api/teachers/:id             - Remove teacher
GET    /api/organizations/:orgId/teachers - Get teachers in organization
```

### Classrooms

```
GET    /api/classrooms               - List classrooms (role-based filtering)
POST   /api/classrooms               - Create classroom (Admin/Teacher)
GET    /api/classrooms/:id           - Get classroom details
PUT    /api/classrooms/:id           - Update classroom
DELETE /api/classrooms/:id           - Delete classroom
GET    /api/classrooms/:id/students  - Get enrolled students
POST   /api/classrooms/:id/enroll    - Enroll students
DELETE /api/classrooms/:id/students/:studentId - Remove student
GET    /api/classrooms/:id/stats     - Get classroom statistics
```

### Programs

```
GET    /api/classrooms/:classId/programs     - List programs in classroom
POST   /api/classrooms/:classId/programs     - Create program
GET    /api/programs/:id                     - Get program details
PUT    /api/programs/:id                     - Update program
DELETE /api/programs/:id                     - Delete program
PUT    /api/programs/:id/reorder             - Reorder programs
```

### Submissions

```
GET    /api/programs/:programId/submissions          - Get all submissions (Teacher)
GET    /api/programs/:programId/my-submission        - Get student's submission
POST   /api/programs/:programId/submissions          - Create/update submission
PUT    /api/submissions/:id/algorithm                - Submit algorithm
PUT    /api/submissions/:id/approve-algorithm        - Approve algorithm (Teacher)
PUT    /api/submissions/:id/reject-algorithm         - Reject algorithm (Teacher)
PUT    /api/submissions/:id/code                     - Save code
POST   /api/submissions/:id/execute                  - Execute code
POST   /api/submissions/:id/ai-review                - Get AI review
PUT    /api/submissions/:id/submit                   - Final submission
PUT    /api/submissions/:id/evaluate                 - Teacher evaluation
GET    /api/submissions/:id/versions                 - Get version history
```

### Code Execution

```
POST   /api/execute                  - Execute code via Judge0
GET    /api/execute/:token           - Get execution result
GET    /api/languages                - Get supported languages
```

### AI Review

```
POST   /api/ai/review                - Get AI code review
POST   /api/ai/suggest               - Get code suggestions
POST   /api/ai/explain               - Explain code/errors
```

### PDF Generation

```
GET    /api/classrooms/:id/pdf/:studentId    - Generate classroom record PDF
POST   /api/submissions/:id/pdf              - Generate single submission PDF
```

### Notifications

```
GET    /api/notifications            - Get user notifications
PUT    /api/notifications/:id/read   - Mark as read
PUT    /api/notifications/read-all   - Mark all as read
DELETE /api/notifications/:id        - Delete notification
```

### Analytics & Reports

```
GET    /api/analytics/dashboard              - Dashboard stats (role-based)
GET    /api/analytics/classroom/:id          - Classroom analytics
GET    /api/analytics/student/:id            - Student progress
GET    /api/analytics/teacher/:id            - Teacher performance
```

---

## Page Structure & Routes

### Public Pages

```
/                           - Landing page
/login                      - Login page
/signup                     - Signup page
/forgot-password            - Password reset
```

### SuperAdmin Dashboard

```
/superadmin
/superadmin/organizations
/superadmin/organizations/new
/superadmin/organizations/:id
/superadmin/organizations/:id/edit
/superadmin/admins
/superadmin/admins/new
/superadmin/analytics
```

### Admin Dashboard

```
/admin
/admin/teachers
/admin/teachers/new
/admin/classrooms
/admin/classrooms/new
/admin/classrooms/:id
/admin/students
/admin/analytics
```

### Teacher Dashboard

```
/teacher
/teacher/classrooms
/teacher/classrooms/:id
/teacher/classrooms/:id/programs
/teacher/classrooms/:id/programs/new
/teacher/classrooms/:id/programs/:programId
/teacher/classrooms/:id/programs/:programId/submissions
/teacher/classrooms/:id/students
/teacher/analytics
```

### Student Dashboard

```
/student
/student/classrooms
/student/classrooms/:id
/student/classrooms/:id/programs/:programId
  - Algorithm Editor
  - Code Editor (Monaco)
  - Output Console
  - AI Review Panel
/student/progress
```

---

## Component Architecture

### Shared Components

```
/components
  /ui                           - shadcn/ui components
  /layout
    Navbar.jsx
    Sidebar.jsx
    Footer.jsx
  /auth
    LoginForm.jsx
    SignupForm.jsx
  /common
    DataTable.jsx
    LoadingSpinner.jsx
    ErrorBoundary.jsx
    ConfirmDialog.jsx
    NotificationBell.jsx
```

### Role-Specific Components

```
/components/superadmin
  OrganizationCard.jsx
  OrganizationForm.jsx
  AdminManagement.jsx

/components/admin
  TeacherManagement.jsx
  ClassroomManagement.jsx
  StudentManagement.jsx

/components/teacher
  ProgramForm.jsx
  AlgorithmReview.jsx
  SubmissionEvaluation.jsx
  GradingInterface.jsx

/components/student
  AlgorithmEditor.jsx
  CodeEditor.jsx              - Monaco Editor wrapper
  OutputConsole.jsx
  AIReviewPanel.jsx
  SubmissionStatus.jsx
  ProgramCard.jsx
```

### Feature Components

```
/components/code-editor
  MonacoEditor.jsx            - Main editor component
  LanguageSelector.jsx
  ThemeSelector.jsx
  EditorToolbar.jsx
  EditorTabs.jsx

/components/submission
  SubmissionWorkflow.jsx
  VersionHistory.jsx
  ComparisonView.jsx

/components/pdf
  PDFGenerator.jsx
  RecordBookTemplate.jsx
```

---

## Monaco Editor Implementation

### Installation

```bash
npm install @monaco-editor/react
```

### Main Code Editor Component

```jsx
// components/code-editor/MonacoEditor.jsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Save, Sparkles, Download, History } from 'lucide-react';

const LANGUAGE_CONFIG = {
  python: {
    name: 'Python 3',
    judge0_id: 71,
    extension: '.py',
    template: '# Write your Python code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n'
  },
  c: {
    name: 'C (GCC 9.2.0)',
    judge0_id: 50,
    extension: '.c',
    template: '#include <stdio.h>\n\nint main() {\n    // Write your C code here\n    return 0;\n}\n'
  },
  cpp: {
    name: 'C++ (GCC 9.2.0)',
    judge0_id: 54,
    extension: '.cpp',
    template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ code here\n    return 0;\n}\n'
  },
  java: {
    name: 'Java (OpenJDK 13)',
    judge0_id: 62,
    extension: '.java',
    template: 'public class Main {\n    public static void main(String[] args) {\n        // Write your Java code here\n    }\n}\n'
  }
};

export default function MonacoEditor({
  programId,
  submissionId,
  language,
  initialCode,
  algorithmApproved,
  onCodeChange,
  onSave,
  readOnly = false
}) {
  const [code, setCode] = useState(initialCode || LANGUAGE_CONFIG[language].template);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStats, setExecutionStats] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [isGettingReview, setIsGettingReview] = useState(false);
  const [theme, setTheme] = useState('vs-dark');
  const editorRef = useRef(null);

  useEffect(() => {
    if (onCodeChange) {
      onCodeChange(code);
    }
  }, [code, onCodeChange]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      formatOnPaste: true,
      formatOnType: true,
      autoIndent: 'full',
      suggestOnTriggerCharacters: true,
    });
  };

  const executeCode = async () => {
    if (!algorithmApproved) {
      alert('Algorithm must be approved before running code');
      return;
    }

    setIsRunning(true);
    setOutput('Compiling and executing...\n');

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          submissionId
        })
      });

      const result = await response.json();

      if (result.error) {
        setOutput(`Error: ${result.error}`);
      } else {
        let outputText = '';
        
        if (result.stdout) {
          outputText += `Output:\n${result.stdout}\n`;
        }
        
        if (result.stderr) {
          outputText += `\nErrors:\n${result.stderr}\n`;
        }
        
        if (result.compile_output) {
          outputText += `\nCompilation Output:\n${result.compile_output}\n`;
        }

        setOutput(outputText || 'Program executed successfully with no output.');
        
        setExecutionStats({
          time: result.time,
          memory: result.memory,
          status: result.status.description
        });
      }
    } catch (error) {
      setOutput(`Execution failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getAIReview = async () => {
    if (!code || code.trim() === '') {
      alert('Please write some code first');
      return;
    }

    setIsGettingReview(true);
    
    try {
      const response = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          submissionId
        })
      });

      const result = await response.json();
      setAiReview(result);
    } catch (error) {
      console.error('AI review failed:', error);
      alert('Failed to get AI review. Please try again.');
    } finally {
      setIsGettingReview(false);
    }
  };

  const saveCode = async () => {
    try {
      await onSave(code);
      alert('Code saved successfully');
    } catch (error) {
      alert('Failed to save code');
    }
  };

  if (!algorithmApproved) {
    return (
      <Card className="p-8 text-center">
        <div className="mb-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Algorithm Not Approved
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Your algorithm must be approved by the teacher before you can start coding.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Editor Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {LANGUAGE_CONFIG[language].name}
            </Badge>
            
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vs-dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="hc-black">High Contrast</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={executeCode}
              disabled={isRunning || readOnly}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running...' : 'Run Code'}
            </Button>
            
            <Button
              variant="outline"
              onClick={getAIReview}
              disabled={isGettingReview || readOnly}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isGettingReview ? 'Analyzing...' : 'AI Review'}
            </Button>
            
            <Button
              variant="outline"
              onClick={saveCode}
              disabled={readOnly}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          </div>
        </div>
      </Card>

      {/* Monaco Editor */}
      <Card className="overflow-hidden">
        <Editor
          height="500px"
          language={language === 'cpp' ? 'cpp' : language}
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorDidMount}
          theme={theme}
          options={{
            readOnly
          }}
        />
      </Card>

      {/* Output & AI Review Tabs */}
      <Tabs defaultValue="output" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="output">Output Console</TabsTrigger>
          <TabsTrigger value="ai">AI Review</TabsTrigger>
        </TabsList>
        
        <TabsContent value="output">
          <Card className="p-4 bg-black text-green-400 font-mono h-[300px] overflow-auto">
            <pre className="whitespace-pre-wrap">
              {output || 'Run your code to see output...'}
            </pre>
            
            {executionStats && (
              <div className="mt-4 pt-4 border-t border-green-800">
                <div className="text-green-300 text-sm">
                  <div>Status: {executionStats.status}</div>
                  <div>Execution Time: {executionStats.time}s</div>
                  <div>Memory Used: {executionStats.memory} KB</div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="ai">
          <Card className="p-6 h-[300px] overflow-auto">
            {aiReview ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">AI Code Review</h3>
                  <Badge variant={aiReview.score >= 7 ? 'success' : 'warning'}>
                    Score: {aiReview.score}/10
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {aiReview.suggestions?.map((suggestion, idx) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4">
                      <p className="font-medium text-sm text-blue-600">
                        {suggestion.category}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.message}
                      </p>
                    </div>
                  ))}
                </div>
                
                {aiReview.bestPractices && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2">Best Practices</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {aiReview.bestPractices.map((practice, idx) => (
                        <li key={idx}>{practice}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Click "AI Review" to get suggestions on improving your code
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Student Program Submission Page

```jsx
// app/student/classrooms/[classroomId]/programs/[programId]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonacoEditor from '@/components/code-editor/MonacoEditor';
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react';

export default function ProgramSubmissionPage({ params }) {
  const [program, setProgram] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [algorithmText, setAlgorithmText] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgramAndSubmission();
  }, []);

  const fetchProgramAndSubmission = async () => {
    // Fetch program details
    const programRes = await fetch(`/api/programs/${params.programId}`);
    const programData = await programRes.json();
    setProgram(programData);

    // Fetch or create submission
    const submissionRes = await fetch(
      `/api/programs/${params.programId}/my-submission`
    );
    const submissionData = await submissionRes.json();
    setSubmission(submissionData);
    
    if (submissionData) {
      setAlgorithmText(submissionData.algorithm_text || '');
      setCode(submissionData.code || '');
    }
    
    setLoading(false);
  };

  const submitAlgorithm = async () => {
    const res = await fetch(`/api/submissions/${submission.id}/algorithm`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algorithm_text: algorithmText })
    });

    if (res.ok) {
      alert('Algorithm submitted for review');
      fetchProgramAndSubmission();
    }
  };

  const saveCodeDraft = async (codeContent) => {
    await fetch(`/api/submissions/${submission.id}/code`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeContent })
    });
  };

  const submitFinal = async () => {
    const confirmed = confirm(
      'Are you sure you want to submit? You cannot modify after submission.'
    );
    
    if (confirmed) {
      const res = await fetch(`/api/submissions/${submission.id}/submit`, {
        method: 'PUT'
      });

      if (res.ok) {
        alert('Submission completed successfully');
        fetchProgramAndSubmission();
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  const getStatusBadge = () => {
    switch (submission?.status) {
      case 'algorithm_approved':
        return <Badge className="bg-green-500">Algorithm Approved</Badge>;
      case 'algorithm_rejected':
        return <Badge variant="destructive">Algorithm Rejected</Badge>;
      case 'algorithm_submitted':
        return <Badge variant="secondary">Awaiting Approval</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">{program.title}</h1>
          {getStatusBadge()}
        </div>
        <p className="text-muted-foreground">{program.description}</p>
        <div className="flex gap-4 mt-2">
          <Badge variant="outline">{program.language.toUpperCase()}</Badge>
          <Badge variant="outline">Due: {new Date(program.due_date).toLocaleDateString()}</Badge>
        </div>
      </div>

      <Tabs defaultValue="algorithm" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="algorithm">
            Step 1: Algorithm
          </TabsTrigger>
          <TabsTrigger 
            value="code"
            disabled={submission?.status !== 'algorithm_approved' && submission?.status !== 'code_in_progress'}
          >
            Step 2: Code
          </TabsTrigger>
          <TabsTrigger value="status">
            Submission Status
          </TabsTrigger>
        </TabsList>

        {/* Algorithm Tab */}
        <TabsContent value="algorithm">
          <Card>
            <CardHeader>
              <CardTitle>Write Your Algorithm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission?.status === 'algorithm_rejected' && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-red-800 font-semibold">Algorithm Rejected</p>
                  <p className="text-red-600 text-sm mt-1">
                    Teacher Feedback: {submission.algorithm_feedback}
                  </p>
                </div>
              )}

              {submission?.status === 'algorithm_approved' && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-green-800 font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Algorithm Approved
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    You can now proceed to write your code
                  </p>
                </div>
              )}

              <Textarea
                value={algorithmText}
                onChange={(e) => setAlgorithmText(e.target.value)}
                placeholder="Write your algorithm here (step-by-step logic)..."
                className="min-h-[300px] font-mono"
                disabled={submission?.status === 'algorithm_approved'}
              />

              {submission?.status !== 'algorithm_approved' && (
                <Button 
                  onClick={submitAlgorithm}
                  disabled={!algorithmText.trim()}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Submit Algorithm for Review
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle>Write Your Code</CardTitle>
            </CardHeader>
            <CardContent>
              <MonacoEditor
                programId={program.id}
                submissionId={submission?.id}
                language={program.language}
                initialCode={code}
                algorithmApproved={submission?.status === 'algorithm_approved'}
                onCodeChange={setCode}
                onSave={saveCodeDraft}
                readOnly={submission?.status === 'completed'}
              />

              {submission?.status !== 'completed' && (
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={submitFinal}
                    disabled={!code.trim()}
                    size="lg"
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Submit Final Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Submission Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timeline component showing submission history */}
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`rounded-full p-2 ${submission?.algorithm_submitted_at ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="w-0.5 h-12 bg-gray-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Algorithm Submitted</h4>
                    <p className="text-sm text-muted-foreground">
                      {submission?.algorithm_submitted_at 
                        ? new Date(submission.algorithm_submitted_at).toLocaleString()
                        : 'Not submitted yet'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`rounded-full p-2 ${submission?.algorithm_approved_at ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="w-0.5 h-12 bg-gray-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Algorithm Approved</h4>
                    <p className="text-sm text-muted-foreground">
                      {submission?.algorithm_approved_at 
                        ? new Date(submission.algorithm_approved_at).toLocaleString()
                        : 'Awaiting teacher review'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`rounded-full p-2 ${submission?.submitted_at ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="w-0.5 h-12 bg-gray-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Code Submitted</h4>
                    <p className="text-sm text-muted-foreground">
                      {submission?.submitted_at 
                        ? new Date(submission.submitted_at).toLocaleString()
                        : 'Not submitted yet'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-full p-2 bg-gray-300">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Teacher Evaluation</h4>
                    <p className="text-sm text-muted-foreground">
                      {submission?.evaluated_at 
                        ? `Grade: ${submission.grade}/100`
                        : 'Awaiting evaluation'}
                    </p>
                    {submission?.teacher_feedback && (
                      <p className="text-sm mt-2 p-3 bg-blue-50 rounded">
                        {submission.teacher_feedback}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Judge0 Self-Hosting Setup

### Installation Guide

```bash
# 1. Clone Judge0
git clone https://github.com/judge0/judge0.git
cd judge0

# 2. Use Docker Compose
docker-compose up -d

# This will start:
# - Judge0 API Server (port 2358)
# - PostgreSQL database
# - Redis cache
# - Workers for code execution
```

### Configuration

Create `.env` file:

```env
# Judge0 Configuration
JUDGE0_VERSION=1.13.0
JUDGE0_HOMEPAGE=https://your-domain.com

# Database
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=judge0

# Redis
REDIS_PASSWORD=your_redis_password

# Authentication (optional)
AUTHENTICATION_ENABLED=true
AUTHENTICATION_TOKEN=your_secret_token

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=10

# Resource Limits
ENABLE_CPU_TIME_LIMIT=true
ENABLE_MEMORY_LIMIT=true
MAX_CPU_TIME_LIMIT=15
MAX_MEMORY_LIMIT=512000
```

### API Integration in Next.js

```javascript
// lib/judge0.js
const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';
const JUDGE0_TOKEN = process.env.JUDGE0_AUTH_TOKEN;

export async function executeCode({ code, language_id, stdin = '' }) {
  try {
    // Step 1: Create submission
    const submissionResponse = await fetch(`${JUDGE0_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(JUDGE0_TOKEN && { 'Authorization': `Bearer ${JUDGE0_TOKEN}` })
      },
      body: JSON.stringify({
        source_code: Buffer.from(code).toString('base64'),
        language_id,
        stdin: Buffer.from(stdin).toString('base64'),
        cpu_time_limit: 10,
        memory_limit: 256000,
      })
    });

    const { token } = await submissionResponse.json();

    // Step 2: Poll for result
    let result;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const resultResponse = await fetch(
        `${JUDGE0_URL}/submissions/${token}?base64_encoded=true`,
        {
          headers: {
            ...(JUDGE0_TOKEN && { 'Authorization': `Bearer ${JUDGE0_TOKEN}` })
          }
        }
      );

      result = await resultResponse.json();

      // Status IDs: 1=In Queue, 2=Processing, 3=Accepted, ...
      if (result.status.id > 2) {
        break;
      }

      attempts++;
    }

    // Decode results
    return {
      stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : null,
      stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : null,
      compile_output: result.compile_output 
        ? Buffer.from(result.compile_output, 'base64').toString() 
        : null,
      status: result.status,
      time: result.time,
      memory: result.memory,
    };
  } catch (error) {
    throw new Error(`Judge0 execution failed: ${error.message}`);
  }
}

// API Route: /api/execute
import { executeCode } from '@/lib/judge0';

export async function POST(request) {
  const { code, language, submissionId } = await request.json();

  const LANGUAGE_MAP = {
    python: 71,
    c: 50,
    cpp: 54,
    java: 62,
  };

  try {
    const result = await executeCode({
      code,
      language_id: LANGUAGE_MAP[language]
    });

    // Log execution to database
    await supabase.from('execution_logs').insert({
      submission_id: submissionId,
      code,
      language,
      stdout: result.stdout,
      stderr: result.stderr,
      execution_time: result.time,
      memory_used: result.memory,
    });

    // Update submission with latest execution
    await supabase
      .from('submissions')
      .update({
        code_output: result.stdout || result.stderr,
        execution_time: result.time,
        memory_used: result.memory,
      })
      .eq('id', submissionId);

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

## AI Code Review Implementation

### Claude API Integration

```javascript
// lib/ai-review.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function getCodeReview({ code, language }) {
  const prompt = `You are an experienced ${language} programming instructor reviewing student code. 

Analyze this ${language} code and provide:
1. Overall code quality score (1-10)
2. Specific improvement suggestions
3. Best practices they should follow
4. Security concerns (if any)
5. Performance optimization tips
6. Code readability feedback

Be encouraging and educational. Focus on helping the student learn.

Code:
\`\`\`${language}
${code}
\`\`\`

Provide your review in this JSON format:
{
  "score": <1-10>,
  "summary": "<brief overall assessment>",
  "suggestions": [
    {
      "category": "<category name>",
      "message": "<specific suggestion>",
      "severity": "<low|medium|high>"
    }
  ],
  "bestPractices": [
    "<best practice 1>",
    "<best practice 2>"
  ],
  "securityConcerns": [
    "<concern 1 if any>"
  ],
  "encouragement": "<encouraging message>"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  const responseText = message.content[0].text;
  
  // Extract JSON from response (Claude might wrap it in markdown)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error('Failed to parse AI review response');
}

// API Route: /api/ai/review
import { getCodeReview } from '@/lib/ai-review';

export async function POST(request) {
  const { code, language, submissionId } = await request.json();

  try {
    const review = await getCodeReview({ code, language });

    // Save AI review to database
    await supabase
      .from('submissions')
      .update({
        ai_review_text: JSON.stringify(review),
        ai_review_score: review.score,
        ai_reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    return Response.json(review);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

## PDF Generation

### Record Book PDF Generator

```javascript
// lib/pdf-generator.js
import { jsPDF } from 'jspdf';

export async function generateRecordBookPDF({ classroom, student, submissions }) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Cover Page
  doc.setFontSize(24);
  doc.text('Digital Record Book', 105, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(16);
  doc.text(classroom.name, 105, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.text(`Student: ${student.name}`, 105, yPosition, { align: 'center' });
  doc.text(`Roll No: ${student.roll_no}`, 105, yPosition + 7, { align: 'center' });
  doc.text(`Semester: ${classroom.semester}`, 105, yPosition + 14, { align: 'center' });

  // Add each program
  submissions.forEach((submission, index) => {
    doc.addPage();
    yPosition = 20;

    // Program Header
    doc.setFontSize(16);
    doc.text(`Program ${index + 1}: ${submission.program.title}`, 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Language: ${submission.program.language.toUpperCase()}`, 20, yPosition);
    doc.text(`Date: ${new Date(submission.submitted_at).toLocaleDateString()}`, 120, yPosition);
    
    // Algorithm
    yPosition += 15;
    doc.setFontSize(14);
    doc.text('Algorithm:', 20, yPosition);
    
    yPosition += 7;
    doc.setFontSize(10);
    const algorithmLines = doc.splitTextToSize(submission.algorithm_text, 170);
    doc.text(algorithmLines, 20, yPosition);
    yPosition += algorithmLines.length * 5 + 10;

    // Code
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Code:', 20, yPosition);
    
    yPosition += 7;
    doc.setFont('courier');
    doc.setFontSize(8);
    const codeLines = doc.splitTextToSize(submission.code, 170);
    
    // Handle code spanning multiple pages
    codeLines.forEach(line => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 20, yPosition);
      yPosition += 4;
    });

    // Output
    doc.setFont('helvetica');
    doc.setFontSize(14);
    yPosition += 10;
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text('Output:', 20, yPosition);
    
    yPosition += 7;
    doc.setFont('courier');
    doc.setFontSize(8);
    const outputLines = doc.splitTextToSize(submission.code_output || 'No output', 170);
    doc.text(outputLines, 20, yPosition);
    yPosition += outputLines.length * 4 + 10;

    // Grade
    if (submission.grade) {
      doc.setFont('helvetica');
      doc.setFontSize(12);
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`Grade: ${submission.grade}/100`, 20, yPosition);
      
      if (submission.teacher_feedback) {
        yPosition += 7;
        doc.setFontSize(10);
        doc.text('Teacher Feedback:', 20, yPosition);
        yPosition += 5;
        const feedbackLines = doc.splitTextToSize(submission.teacher_feedback, 170);
        doc.text(feedbackLines, 20, yPosition);
      }
    }
  });

  return doc;
}

// API Route: /api/classrooms/[id]/pdf/[studentId]
import { generateRecordBookPDF } from '@/lib/pdf-generator';

export async function GET(request, { params }) {
  const { id: classroomId, studentId } = params;

  // Fetch classroom, student, and all approved submissions
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('*')
    .eq('id', classroomId)
    .single();

  const { data: student } = await supabase
    .from('users')
    .select('*')
    .eq('id', studentId)
    .single();

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      program:programs(*)
    `)
    .eq('student_id', studentId)
    .in('status', ['code_evaluated', 'completed'])
    .order('program.order_index');

  const pdf = await generateRecordBookPDF({
    classroom,
    student,
    submissions
  });

  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="RecordBook_${student.name}.pdf"`
    }
  });
}
```

---

## Development Phases

### Phase 1: Foundation (Week 1-2)

**Deliverables:**
- Project setup (Next.js, Supabase, shadcn/ui)
- Database schema implementation
- Authentication system (all roles)
- Basic routing structure

**Tasks:**
1. Initialize Next.js project with shadcn/ui
2. Set up Supabase project
3. Create database tables with RLS policies
4. Implement auth with role-based access
5. Create basic layouts for each role
6. Set up environment variables

### Phase 2: Organization & User Management (Week 3)

**Deliverables:**
- SuperAdmin dashboard
- Organization CRUD
- Admin management
- Teacher management

**Tasks:**
1. SuperAdmin organization management UI
2. Admin creation and assignment
3. Teacher management by admins
4. User invitation system
5. Role-based navigation

### Phase 3: Classroom & Program Management (Week 4-5)

**Deliverables:**
- Classroom CRUD
- Student enrollment
- Program assignment creation
- Teacher dashboard

**Tasks:**
1. Classroom creation and management
2. Student enrollment interface
3. Program creation form
4. Test case management
5. Classroom overview dashboard

### Phase 4: Student Submission Workflow (Week 6-7)

**Deliverables:**
- Algorithm editor
- Algorithm approval workflow
- Monaco editor integration
- Basic code execution

**Tasks:**
1. Algorithm submission interface
2. Teacher algorithm review UI
3. Monaco editor component
4. Judge0 integration
5. Code execution and output display

### Phase 5: AI Integration (Week 8)

**Deliverables:**
- AI code review
- Suggestion system
- Review storage

**Tasks:**
1. Claude API integration
2. Code review prompt engineering
3. Review display component
4. Review history tracking

### Phase 6: Evaluation & Grading (Week 9)

**Deliverables:**
- Teacher evaluation interface
- Grading system
- Feedback mechanism
- Submission status tracking

**Tasks:**
1. Submission review UI for teachers
2. Grading interface
3. Feedback forms
4. Status update workflows
5. Notifications

### Phase 7: PDF Generation & Export (Week 10)

**Deliverables:**
- Record book PDF generator
- Download functionality
- Print-friendly format

**Tasks:**
1. PDF template design
2. PDF generation logic
3. Batch PDF generation
4. Download endpoints

### Phase 8: Analytics & Polish (Week 11-12)

**Deliverables:**
- Analytics dashboards
- Progress tracking
- Performance optimization
- Bug fixes and testing

**Tasks:**
1. Student progress analytics
2. Teacher performance metrics
3. Classroom statistics
4. Code optimization
5. Comprehensive testing
6. Documentation

---

## Environment Variables

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Judge0
JUDGE0_URL=http://your-judge0-server:2358
JUDGE0_AUTH_TOKEN=your_judge0_token

# Anthropic AI
ANTHROPIC_API_KEY=your_anthropic_api_key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Deployment Guide

### Frontend (Vercel)

```bash
# 1. Connect GitHub repo to Vercel
# 2. Configure environment variables in Vercel dashboard
# 3. Deploy

# Or via CLI
vercel --prod
```

### Judge0 (VPS/Cloud)

```bash
# 1. Provision Ubuntu server (2GB RAM minimum)
# 2. Install Docker and Docker Compose
sudo apt update
sudo apt install docker.io docker-compose

# 3. Clone and configure Judge0
git clone https://github.com/judge0/judge0.git
cd judge0
cp .env.example .env
# Edit .env with your settings

# 4. Start Judge0
docker-compose up -d

# 5. Configure firewall
sudo ufw allow 2358
sudo ufw enable

# 6. Set up reverse proxy (nginx) with SSL
sudo apt install nginx certbot python3-certbot-nginx
# Configure nginx for Judge0
sudo certbot --nginx
```

### Database (Supabase Cloud)

- Use Supabase cloud for managed PostgreSQL
- Or self-host PostgreSQL on VPS if preferred
- Run migration scripts from schema section

---

## Security Considerations

### Code Execution Security

1. **Judge0 Isolation**: Runs in Docker containers
2. **Resource Limits**: CPU time and memory limits enforced
3. **Network Isolation**: Judge0 has no internet access for code execution
4. **Input Sanitization**: All code inputs are base64 encoded

### Authentication Security

1. **Supabase Auth**: Industry-standard authentication
2. **Row Level Security**: Database-level access control
3. **API Route Protection**: Middleware checks for auth
4. **Role-based Access**: Granular permissions per role

### Data Security

1. **Encrypted at Rest**: Supabase encryption
2. **HTTPS Only**: Enforce SSL/TLS
3. **SQL Injection Prevention**: Parameterized queries
4. **XSS Protection**: Input sanitization

---

## Testing Strategy

### Unit Tests
- Component testing with Jest and React Testing Library
- API route testing
- Utility function testing

### Integration Tests
- Authentication flows
- Submission workflows
- Code execution pipeline

### E2E Tests
- Cypress for full user journeys
- Test each role's complete workflow

### Performance Testing
- Load testing Judge0 with multiple concurrent executions
- Database query optimization
- Frontend bundle size optimization

---

## Success Metrics

### For Students
- Average time from algorithm to submission < 2 hours
- 80%+ find AI review helpful
- PDF download success rate > 95%

### For Teachers
- Algorithm review time < 10 minutes per submission
- Grading time reduced by 50% vs. paper-based
- Real-time visibility into student progress

### System Performance
- Code execution response time < 5 seconds
- Page load time < 2 seconds
- 99% uptime for Judge0

---

## Future Enhancements

1. **Plagiarism Detection**: Compare code similarity across submissions
2. **Live Collaboration**: Real-time code pairing with teachers
3. **Mobile App**: React Native app for code review on-the-go
4. **Automated Testing**: Student code against hidden test cases
5. **Leaderboards**: Gamification with points and badges
6. **Code Snippets Library**: Reusable code templates
7. **Video Tutorials**: Integrated learning resources
8. **Peer Review**: Student-to-student code review
9. **Version Control Integration**: Git integration for advanced students
10. **IDE Extensions**: VS Code extension for submissions

---

## Reference Resources

### Judge0 IDE GitHub
- **URL**: https://github.com/judge0/ide
- **Use for**: 
  - Language configuration examples
  - Monaco editor setup reference
  - API integration patterns
  - UI inspiration

### Monaco Editor
- **Docs**: https://microsoft.github.io/monaco-editor/
- **React Package**: @monaco-editor/react
- **Language Support**: Built-in for Python, C, C++, Java

### Judge0 Documentation
- **API Docs**: https://ce.judge0.com/
- **Deployment**: https://github.com/judge0/judge0/blob/master/CHANGELOG.md

### shadcn/ui Components
- **URL**: https://ui.shadcn.com/
- **Components Used**: 
  - Button, Card, Tabs
  - Select, Textarea, Badge
  - Dialog, Alert, Table

---

## Getting Started Command

```bash
# 1. Clone repository
git clone <your-repo>
cd digital-record-book

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Set up database
# Run SQL schema from database section in Supabase SQL Editor

# 5. Start development server
npm run dev

# 6. Create first SuperAdmin user manually in Supabase
# Insert into users table with role='superadmin'

# 7. Access application
# Open http://localhost:3000
```

---

## Support & Maintenance

### Regular Tasks
- Monitor Judge0 server health
- Database backup (daily)
- Review execution logs for errors
- Update dependencies monthly
- Monitor API usage (Claude API costs)

### Troubleshooting
- **Code won't execute**: Check Judge0 server status, verify language ID
- **AI review fails**: Check Anthropic API key and quota
- **PDF generation issues**: Verify jsPDF version compatibility
- **Auth problems**: Check Supabase configuration and RLS policies

---

## File Structure

```
digital-record-book/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── superadmin/
│   │   ├── organizations/
│   │   └── admins/
│   ├── admin/
│   │   ├── teachers/
│   │   ├── classrooms/
│   │   └── students/
│   ├── teacher/
│   │   ├── classrooms/
│   │   └── programs/
│   ├── student/
│   │   └── classrooms/
│   │       └── [id]/
│   │           └── programs/
│   │               └── [programId]/
│   └── api/
│       ├── auth/
│       ├── organizations/
│       ├── classrooms/
│       ├── programs/
│       ├── submissions/
│       ├── execute/
│       ├── ai/
│       └── pdf/
├── components/
│   ├── ui/                 # shadcn components
│   ├── layout/
│   ├── code-editor/
│   │   └── MonacoEditor.jsx
│   ├── superadmin/
│   ├── admin/
│   ├── teacher/
│   └── student/
├── lib/
│   ├── supabase.js
│   ├── judge0.js
│   ├── ai-review.js
│   └── pdf-generator.js
├── hooks/
│   ├── useAuth.js
│   ├── useSubmission.js
│   └── usePrograms.js
└── types/
    └── index.ts
```

---

## License & Credits

This project uses:
- **Next.js** (MIT)
- **Supabase** (Apache 2.0)
- **Judge0** (GNU General Public License v3.0)
- **Monaco Editor** (MIT)
- **shadcn/ui** (MIT)
- **Anthropic Claude API** (Commercial)

---

## Contact & Support

For questions during development:
- Review Judge0 IDE source code for implementation patterns
- Consult Monaco Editor documentation for editor features
- Check Supabase docs for database and auth patterns
- Reference shadcn/ui for component examples

---

**END OF BUILD GUIDE**

This document provides a complete technical specification for building the Digital Record Book platform. Use it as a comprehensive reference for development, providing it to AI IDE agents or development teams for implementation.
