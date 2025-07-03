// 输入验证工具函数
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: string[];
  type?: 'string' | 'number' | 'email' | 'phone';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// 通用验证函数
export function validateField(value: any, rule: ValidationRule, fieldName: string): ValidationResult {
  const errors: string[] = [];

  // 必填检查
  if (rule.required && (!value || value.toString().trim() === '')) {
    errors.push(`${fieldName}不能为空`);
    return { isValid: false, errors };
  }

  // 如果值为空且非必填，直接通过
  if (!value || value.toString().trim() === '') {
    return { isValid: true, errors: [] };
  }

  const strValue = value.toString().trim();

  // 长度检查
  if (rule.minLength && strValue.length < rule.minLength) {
    errors.push(`${fieldName}长度不能少于${rule.minLength}个字符`);
  }

  if (rule.maxLength && strValue.length > rule.maxLength) {
    errors.push(`${fieldName}长度不能超过${rule.maxLength}个字符`);
  }

  // 模式检查
  if (rule.pattern && !rule.pattern.test(strValue)) {
    errors.push(`${fieldName}格式不正确`);
  }

  // 枚举值检查
  if (rule.enum && !rule.enum.includes(strValue)) {
    errors.push(`${fieldName}必须是以下值之一: ${rule.enum.join(', ')}`);
  }

  // 类型检查
  if (rule.type) {
    switch (rule.type) {
      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(strValue)) {
          errors.push(`${fieldName}必须是有效的邮箱地址`);
        }
        break;
      case 'phone':
        const phonePattern = /^1[3-9]\d{9}$/;
        if (!phonePattern.test(strValue)) {
          errors.push(`${fieldName}必须是有效的手机号码`);
        }
        break;
      case 'number':
        if (isNaN(Number(strValue))) {
          errors.push(`${fieldName}必须是数字`);
        }
        break;
    }
  }

  return { isValid: errors.length === 0, errors };
}

// 批量验证
export function validateObject(obj: any, rules: Record<string, ValidationRule>): ValidationResult {
  const errors: string[] = [];
  let isValid = true;

  for (const [fieldName, rule] of Object.entries(rules)) {
    const result = validateField(obj[fieldName], rule, fieldName);
    if (!result.isValid) {
      isValid = false;
      errors.push(...result.errors);
    }
  }

  return { isValid, errors };
}

// 预定义的验证规则
export const validationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
  },
  password: {
    required: true,
    minLength: 6,
    maxLength: 50,
  },
  studentId: {
    required: true,
    pattern: /^\d+$/,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 20,
    pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/,
  },
  email: {
    type: 'email' as const,
    maxLength: 100,
  },
  phone: {
    type: 'phone' as const,
  },
  creditType: {
    required: true,
    // enum 在运行时动态获取，不再硬编码
  },
  activityName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  competitionName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  certificateName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  volunteerName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  volunteerHours: {
    required: true,
    type: 'number' as const,
  },
  noticeTitle: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  noticeContent: {
    required: true,
    minLength: 10,
    maxLength: 2000,
  },
};

// HTML 转义函数
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 服务端 HTML 转义函数
export function escapeHtmlServer(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// 添加用户表单校验
export function validateUserForm(form: any) {
  const errors: any = {};
  if (!form.role) errors.role = '请选择角色';
  if (!form.username) errors.username = '请输入用户名';
  if (!form.password) errors.password = '请输入密码';
  if (form.role !== 'admin') {
    if (!form.name) errors.name = '请输入姓名';
    if (!form.studentId) {
      errors.studentId = '请输入学号';
    } else if (!/^\d+$/.test(form.studentId)) {
      errors.studentId = '学号只能包含数字';
    }
    if (!form.grade) errors.grade = '请选择年级';
    if (!form.major) errors.major = '请选择专业';
    if (!form.className) errors.className = '请选择班级';
  }
  // 密码强度
  if (form.password && form.password.length < 6) errors.password = '密码至少6位';
  if (form.password && !/[A-Za-z]/.test(form.password)) errors.password = '密码需包含字母';
  if (form.password && !/\d/.test(form.password)) errors.password = '密码需包含数字';
  return { isValid: Object.keys(errors).length === 0, errors };
}

// 密码强度提示
export function getPasswordStrength(pwd: string): string {
  if (!pwd) return '';
  let score = 0;
  if (pwd.length >= 6) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return '弱';
  if (score === 3) return '中';
  if (score >= 4) return '强';
  return '';
} 