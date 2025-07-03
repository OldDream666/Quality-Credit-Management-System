/**
 * 数据库配置管理器
 * 支持动态配置的增删改查
 */

import pool from '@/lib/db';
import { UserRole, CreditType } from '@/types';
import { RoleConfig, CreditTypeConfig, StatusConfig } from '@/config/system';

export class DatabaseConfigManager {
  
  // ===== 角色配置管理 =====
  
  /**
   * 获取所有角色配置
   */
  static async getAllRoles(): Promise<RoleConfig[]> {
    try {
      const result = await pool.query(`
        SELECT config_value FROM system_config 
        WHERE category = 'role' AND is_active = true
        ORDER BY config_key
      `);
      
      return result.rows.map((row: any) => JSON.parse(row.config_value));
    } catch (error) {
      console.error('获取角色配置失败:', error);
      throw new Error('获取角色配置失败');
    }
  }

  /**
   * 获取单个角色配置
   */
  static async getRoleConfig(roleKey: string): Promise<RoleConfig | null> {
    try {
      const result = await pool.query(`
        SELECT config_value FROM system_config 
        WHERE category = 'role' AND config_key = $1 AND is_active = true
      `, [roleKey]);
      
      return result.rows.length > 0 ? JSON.parse(result.rows[0].config_value) : null;
    } catch (error) {
      console.error('获取角色配置失败:', error);
      return null;
    }
  }

  /**
   * 创建或更新角色配置
   */
  static async saveRoleConfig(config: RoleConfig): Promise<boolean> {
    try {
      const result = await pool.query(`
        INSERT INTO system_config 
        (category, config_key, config_value, updated_at) 
        VALUES ('role', $1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (category, config_key) 
        DO UPDATE SET config_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [config.key, JSON.stringify(config)]);
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('保存角色配置失败:', error);
      throw new Error('保存角色配置失败');
    }
  }

  /**
   * 删除角色配置（软删除）
   */
  static async deleteRoleConfig(roleKey: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        UPDATE system_config 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE category = 'role' AND config_key = $1
      `, [roleKey]);
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('删除角色配置失败:', error);
      throw new Error('删除角色配置失败');
    }
  }

  // ===== 学分类型配置管理 =====

  /**
   * 获取所有学分类型配置
   */
  static async getAllCreditTypes(): Promise<CreditTypeConfig[]> {
    try {
      const result = await pool.query(`
        SELECT config_value FROM system_config 
        WHERE category = 'credit_type' AND is_active = true
        ORDER BY config_key
      `);
      
      return result.rows.map((row: any) => JSON.parse(row.config_value));
    } catch (error) {
      console.error('获取学分类型配置失败:', error);
      throw new Error('获取学分类型配置失败');
    }
  }

  /**
   * 获取单个学分类型配置
   */
  static async getCreditTypeConfig(typeKey: string): Promise<CreditTypeConfig | null> {
    try {
      const result = await pool.query(`
        SELECT config_value FROM system_config 
        WHERE category = 'credit_type' AND config_key = $1 AND is_active = true
      `, [typeKey]);
      
      return result.rows.length > 0 ? JSON.parse(result.rows[0].config_value) : null;
    } catch (error) {
      console.error('获取学分类型配置失败:', error);
      return null;
    }
  }

  /**
   * 创建或更新学分类型配置
   */
  static async saveCreditTypeConfig(config: CreditTypeConfig): Promise<boolean> {
    try {
      const result = await pool.query(`
        INSERT INTO system_config 
        (category, config_key, config_value, updated_at) 
        VALUES ('credit_type', $1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (category, config_key) 
        DO UPDATE SET config_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [config.key, JSON.stringify(config)]);
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('保存学分类型配置失败:', error);
      throw new Error('保存学分类型配置失败');
    }
  }

  /**
   * 删除学分类型配置（软删除）
   */
  static async deleteCreditTypeConfig(typeKey: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        UPDATE system_config 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE category = 'credit_type' AND config_key = $1
      `, [typeKey]);
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('删除学分类型配置失败:', error);
      throw new Error('删除学分类型配置失败');
    }
  }

  // ===== 状态配置管理 =====

  /**
   * 获取所有状态配置
   */
  static async getAllStatuses(): Promise<StatusConfig[]> {
    try {
      const result = await pool.query(`
        SELECT config_value FROM system_config 
        WHERE category = 'status' AND is_active = true
        ORDER BY config_key
      `);
      
      return result.rows.map((row: any) => JSON.parse(row.config_value));
    } catch (error) {
      console.error('获取状态配置失败:', error);
      throw new Error('获取状态配置失败');
    }
  }

  /**
   * 获取单个状态配置
   */
  static async getStatusConfig(statusKey: string): Promise<StatusConfig | null> {
    try {
      const result = await pool.query(`
        SELECT config_value FROM system_config 
        WHERE category = 'status' AND config_key = $1 AND is_active = true
      `, [statusKey]);
      
      return result.rows.length > 0 ? JSON.parse(result.rows[0].config_value) : null;
    } catch (error) {
      console.error('获取状态配置失败:', error);
      return null;
    }
  }

  /**
   * 创建或更新状态配置
   */
  static async saveStatusConfig(config: StatusConfig): Promise<boolean> {
    try {
      const result = await pool.query(`
        INSERT INTO system_config 
        (category, config_key, config_value, updated_at) 
        VALUES ('status', $1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (category, config_key) 
        DO UPDATE SET config_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [config.key, JSON.stringify(config)]);
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('保存状态配置失败:', error);
      throw new Error('保存状态配置失败');
    }
  }

  /**
   * 删除状态配置（软删除）
   */
  static async deleteStatusConfig(statusKey: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        UPDATE system_config 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE category = 'status' AND config_key = $1
      `, [statusKey]);
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('删除状态配置失败:', error);
      throw new Error('删除状态配置失败');
    }
  }

  // ===== 通用配置管理 =====

  /**
   * 获取所有配置
   */
  static async getAllConfigs() {
    try {
      // 一次性查出所有需要的配置，减少多次SQL
      const result = await pool.query(`
        SELECT category, config_key, config_value FROM system_config WHERE is_active = true
      `);
      const roles: any[] = [];
      const creditTypes: any[] = [];
      const statuses: any[] = [];
      let availableFields: any[] = [];
      for (const row of result.rows) {
        if (row.category === 'role') {
          try { roles.push(JSON.parse(row.config_value)); } catch {}
        } else if (row.category === 'credit_type') {
          try { creditTypes.push(JSON.parse(row.config_value)); } catch {}
        } else if (row.category === 'status') {
          try { statuses.push(JSON.parse(row.config_value)); } catch {}
        } else if (row.category === 'fields' && row.config_key === 'available_fields') {
          try { availableFields = JSON.parse(row.config_value); } catch {}
        }
      }
      return { roles, creditTypes, statuses, availableFields };
    } catch (error) {
      console.error('获取配置失败:', error);
      throw new Error('获取配置失败');
    }
  }

  /**
   * 重置配置到默认值
   */
  static async resetToDefaults(): Promise<boolean> {
    try {
      // 标记现有配置为无效
      await pool.query(`
        UPDATE system_config SET is_active = false 
        WHERE category IN ('role', 'credit_type', 'status')
      `);

      return true;
    } catch (error) {
      console.error('重置配置失败:', error);
      throw new Error('重置配置失败');
    }
  }

  /**
   * 验证配置的有效性
   */
  static validateRoleConfig(config: RoleConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.key || config.key.trim() === '') {
      errors.push('角色键不能为空');
    }
    if (!config.label || config.label.trim() === '') {
      errors.push('角色名称不能为空');
    }
    if (!config.description || config.description.trim() === '') {
      errors.push('角色描述不能为空');
    }
    if (!config.color || config.color.trim() === '') {
      errors.push('角色颜色不能为空');
    }
    if (!config.cardColor || config.cardColor.trim() === '') {
      errors.push('卡片颜色不能为空');
    }
    if (!Array.isArray(config.permissions)) {
      errors.push('权限必须是数组');
    }

    return { valid: errors.length === 0, errors };
  }

  static validateCreditTypeConfig(config: CreditTypeConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.key || config.key.trim() === '') {
      errors.push('类型键不能为空');
    }
    if (!config.label || config.label.trim() === '') {
      errors.push('类型名称不能为空');
    }
    if (!config.description || config.description.trim() === '') {
      errors.push('类型描述不能为空');
    }
    if (!config.color || config.color.trim() === '') {
      errors.push('类型颜色不能为空');
    }
    if (!config.cardColor || config.cardColor.trim() === '') {
      errors.push('卡片颜色不能为空');
    }
    if (!Array.isArray(config.fields)) {
      errors.push('字段必须是数组');
    }
    if (config.scoreCalculation && !['fixed', 'time_based', 'manual'].includes(config.scoreCalculation)) {
      errors.push('分数计算方式无效');
    }
    if (config.scoreCalculation === 'time_based' && (!config.scorePerHour || config.scorePerHour <= 0)) {
      errors.push('按时长计算时，每小时分数必须大于0');
    }

    return { valid: errors.length === 0, errors };
  }

  static validateStatusConfig(config: StatusConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.key || config.key.trim() === '') {
      errors.push('状态键不能为空');
    }
    if (!config.label || config.label.trim() === '') {
      errors.push('状态名称不能为空');
    }
    if (!config.color || config.color.trim() === '') {
      errors.push('状态颜色不能为空');
    }

    return { valid: errors.length === 0, errors };
  }
}

export default DatabaseConfigManager;
