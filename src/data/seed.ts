import { generateId, getDB } from '@/services/db';
import type {
  Tenant,
  User,
  Customer,
  Contact,
  Lead,
  Stage,
  Opportunity,
  Activity,
  StageHistory,
  SalesTarget,
  LeadSource,
  CustomerLevelConfig,
} from '@/types/models';

const now = new Date().toISOString();

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysLater(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function seedDatabase(): Promise<void> {
  const db = getDB();
  const tx = db.transaction([
    'tenants', 'users', 'customers', 'contacts', 'leads', 
    'stages', 'opportunities', 'activities', 'stageHistories',
    'salesTargets', 'leadSources', 'customerLevels',
  ], 'readwrite');

  const tenantId1 = generateId();
  const tenantId2 = generateId();

  const tenant1: Tenant = {
    id: tenantId1,
    name: '科技创新有限公司',
    industry: '软件服务',
    timezone: 'Asia/Shanghai',
    createdAt: daysAgo(180),
  };

  const tenant2: Tenant = {
    id: tenantId2,
    name: '云端数据科技',
    industry: '云计算',
    timezone: 'Asia/Shanghai',
    createdAt: daysAgo(120),
  };

  await tx.objectStore('tenants').put(tenant1);
  await tx.objectStore('tenants').put(tenant2);

  const superAdminId = generateId();
  const superAdmin: User = {
    id: superAdminId,
    tenantId: 'platform',
    name: '超级管理员',
    email: 'admin@platform.com',
    phone: '13800000000',
    role: 'super_admin',
    status: 'active',
    createdAt: daysAgo(365),
  };
  await tx.objectStore('users').put(superAdmin);

  const adminId1 = generateId();
  const managerId1 = generateId();
  const repId1 = generateId();
  const repId2 = generateId();
  const repId3 = generateId();

  const users1: User[] = [
    {
      id: adminId1,
      tenantId: tenantId1,
      name: '张伟',
      email: 'zhangwei@techcorp.com',
      phone: '13800010001',
      role: 'tenant_admin',
      status: 'active',
      createdAt: daysAgo(180),
    },
    {
      id: managerId1,
      tenantId: tenantId1,
      name: '李娜',
      email: 'lina@techcorp.com',
      phone: '13800010002',
      role: 'sales_manager',
      status: 'active',
      createdAt: daysAgo(150),
    },
    {
      id: repId1,
      tenantId: tenantId1,
      name: '王强',
      email: 'wangqiang@techcorp.com',
      phone: '13800010003',
      role: 'sales_rep',
      status: 'active',
      createdAt: daysAgo(120),
    },
    {
      id: repId2,
      tenantId: tenantId1,
      name: '刘芳',
      email: 'liufang@techcorp.com',
      phone: '13800010004',
      role: 'sales_rep',
      status: 'active',
      createdAt: daysAgo(100),
    },
    {
      id: repId3,
      tenantId: tenantId1,
      name: '陈明',
      email: 'chenming@techcorp.com',
      phone: '13800010005',
      role: 'sales_rep',
      status: 'active',
      createdAt: daysAgo(90),
    },
  ];

  for (const user of users1) {
    await tx.objectStore('users').put(user);
  }

  const stages: Stage[] = [
    { id: generateId(), tenantId: tenantId1, name: '初步接洽', color: '#3b82f6', order: 1, createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '需求确认', color: '#8b5cf6', order: 2, createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '方案报价', color: '#f59e0b', order: 3, createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '商务谈判', color: '#ef4444', order: 4, createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '赢单', color: '#10b981', order: 5, isWin: true, createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '输单', color: '#6b7280', order: 6, isLoss: true, createdAt: daysAgo(180) },
  ];

  for (const stage of stages) {
    await tx.objectStore('stages').put(stage);
  }

  const leadSources: LeadSource[] = [
    { id: generateId(), tenantId: tenantId1, name: '官网表单', createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '展会', createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '电话营销', createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '客户推荐', createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '社交媒体', createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '其他', createdAt: daysAgo(180) },
  ];

  for (const source of leadSources) {
    await tx.objectStore('leadSources').put(source);
  }

  const customerLevels: CustomerLevelConfig[] = [
    { id: generateId(), tenantId: tenantId1, name: '重点客户', code: 'A', color: '#ef4444', createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '普通客户', code: 'B', color: '#f59e0b', createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '潜在客户', code: 'C', color: '#3b82f6', createdAt: daysAgo(180) },
    { id: generateId(), tenantId: tenantId1, name: '流失客户', code: 'D', color: '#6b7280', createdAt: daysAgo(180) },
  ];

  for (const level of customerLevels) {
    await tx.objectStore('customerLevels').put(level);
  }

  const customers: Customer[] = [
    { id: generateId(), tenantId: tenantId1, ownerId: repId1, name: '华信金融集团', industry: '金融', level: 'A', address: '北京市朝阳区金融街88号', website: 'https://www.huaxin-fin.com', notes: '大型金融集团，IT预算充足', lastFollowUpAt: daysAgo(2), createdAt: daysAgo(100), updatedAt: daysAgo(2) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId1, name: '恒通物流股份', industry: '物流', level: 'B', address: '上海市浦东新区张江路123号', website: 'https://www.hengtong-log.com', notes: '物流行业头部企业', lastFollowUpAt: daysAgo(5), createdAt: daysAgo(90), updatedAt: daysAgo(5) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId2, name: '盛世医药科技', industry: '医药', level: 'A', address: '广州市天河区科学城456号', website: 'https://www.shengshi-pharma.com', notes: '医药研发企业，需求旺盛', lastFollowUpAt: daysAgo(1), createdAt: daysAgo(80), updatedAt: daysAgo(1) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId2, name: '优品电商', industry: '电商', level: 'B', address: '杭州市西湖区文三路789号', website: 'https://www.youpin-shop.com', notes: '快速发展的电商平台', lastFollowUpAt: daysAgo(7), createdAt: daysAgo(70), updatedAt: daysAgo(7) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId3, name: '精工制造集团', industry: '制造', level: 'B', address: '深圳市南山区科技园321号', website: 'https://www.jinggong-mfg.com', notes: '传统制造业数字化转型', lastFollowUpAt: daysAgo(10), createdAt: daysAgo(65), updatedAt: daysAgo(10) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId3, name: '智慧教育科技', industry: '教育', level: 'C', address: '南京市鼓楼区中山路654号', website: 'https://www.zhihui-edu.com', notes: '在线教育初创公司', lastFollowUpAt: daysAgo(15), createdAt: daysAgo(60), updatedAt: daysAgo(15) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId1, name: '蓝天航空服务', industry: '航空', level: 'A', address: '北京市顺义区机场西路987号', website: 'https://www.lantian-air.com', notes: '航空公司，大型客户', lastFollowUpAt: daysAgo(3), createdAt: daysAgo(55), updatedAt: daysAgo(3) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId2, name: '绿洲环保科技', industry: '环保', level: 'C', address: '成都市武侯区天府大道111号', website: 'https://www.lvzhou-eco.com', notes: '环保科技公司', lastFollowUpAt: daysAgo(20), createdAt: daysAgo(50), updatedAt: daysAgo(20) },
  ];

  for (const customer of customers) {
    await tx.objectStore('customers').put(customer);
  }

  const contacts: Contact[] = [
    { id: generateId(), customerId: customers[0].id, tenantId: tenantId1, name: '赵总', position: 'CTO', phone: '13900000001', email: 'zhaozong@huaxin-fin.com', isDecisionMaker: true, createdAt: daysAgo(100) },
    { id: generateId(), customerId: customers[0].id, tenantId: tenantId1, name: '钱经理', position: 'IT经理', phone: '13900000002', email: 'qianjl@huaxin-fin.com', isDecisionMaker: false, createdAt: daysAgo(95) },
    { id: generateId(), customerId: customers[1].id, tenantId: tenantId1, name: '孙总监', position: '运营总监', phone: '13900000003', email: 'sunzj@hengtong-log.com', isDecisionMaker: true, createdAt: daysAgo(90) },
    { id: generateId(), customerId: customers[2].id, tenantId: tenantId1, name: '周博士', position: '研发副总裁', phone: '13900000004', email: 'zhoubs@shengshi-pharma.com', isDecisionMaker: true, createdAt: daysAgo(80) },
    { id: generateId(), customerId: customers[3].id, tenantId: tenantId1, name: '吴经理', position: '技术经理', phone: '13900000005', email: 'wujl@youpin-shop.com', isDecisionMaker: false, createdAt: daysAgo(70) },
    { id: generateId(), customerId: customers[4].id, tenantId: tenantId1, name: '郑工', position: '信息化主管', phone: '13900000006', email: 'zhenggong@jinggong-mfg.com', isDecisionMaker: false, createdAt: daysAgo(65) },
    { id: generateId(), customerId: customers[6].id, tenantId: tenantId1, name: '冯总', position: 'CIO', phone: '13900000007', email: 'fengzong@lantian-air.com', isDecisionMaker: true, createdAt: daysAgo(55) },
  ];

  for (const contact of contacts) {
    await tx.objectStore('contacts').put(contact);
  }

  const leads: Lead[] = [
    { id: generateId(), tenantId: tenantId1, ownerId: repId1, sourceId: leadSources[0].id, companyName: '新兴能源科技', contactName: '杨总', phone: '13700000001', email: 'yangzong@xinxing-energy.com', requirements: '需要客户管理系统', notes: '新能源行业客户', status: 'new', createdAt: daysAgo(3), updatedAt: daysAgo(3) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId1, sourceId: leadSources[1].id, companyName: '盛世文化传媒', contactName: '朱经理', phone: '13700000002', email: 'zhujl@shengshi-media.com', requirements: '销售团队管理需求', notes: '展会收集的线索', status: 'contacted', createdAt: daysAgo(7), updatedAt: daysAgo(2) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId2, sourceId: leadSources[2].id, companyName: '未来科技孵化器', contactName: '秦主任', phone: '13700000003', email: 'qinzhuren@future-inc.com', requirements: 'CRM系统需求', notes: '电话营销线索', status: 'new', createdAt: daysAgo(1), updatedAt: daysAgo(1) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId2, sourceId: leadSources[3].id, companyName: '环球国际贸易', contactName: '许总', phone: '13700000004', email: 'xuzong@global-trade.com', requirements: '销售漏斗管理', notes: '老客户推荐', status: 'contacted', createdAt: daysAgo(5), updatedAt: daysAgo(1) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId3, sourceId: leadSources[4].id, companyName: '星辰智能硬件', contactName: '何经理', phone: '13700000005', email: 'hejl@xingchen-hardware.com', requirements: '客户跟进系统', notes: '社交媒体获取', status: 'new', createdAt: daysAgo(2), updatedAt: daysAgo(2) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId3, sourceId: leadSources[0].id, companyName: '博远咨询服务', contactName: '吕顾问', phone: '13700000006', email: 'lvguwen@boyuan-consult.com', requirements: 'CRM系统咨询', notes: '官网咨询', status: 'contacted', createdAt: daysAgo(10), updatedAt: daysAgo(4) },
    { id: generateId(), tenantId: tenantId1, ownerId: undefined, sourceId: leadSources[5].id, companyName: '和悦酒店集团', contactName: '施经理', phone: '13700000007', email: 'shijl@heyue-hotel.com', requirements: '会员管理系统', notes: '其他渠道', status: 'new', createdAt: daysAgo(1), updatedAt: daysAgo(1) },
    { id: generateId(), tenantId: tenantId1, ownerId: repId1, sourceId: leadSources[2].id, companyName: '锐驰汽车配件', contactName: '张工', phone: '13700000008', email: 'zhanggong@ruichi-auto.com', requirements: '销售管理系统', notes: '电话营销线索', status: 'discarded', discardReason: '预算不足', createdAt: daysAgo(20), updatedAt: daysAgo(15) },
  ];

  for (const lead of leads) {
    await tx.objectStore('leads').put(lead);
  }

  const opportunities: Opportunity[] = [
    { id: generateId(), tenantId: tenantId1, customerId: customers[0].id, ownerId: repId1, name: '华信金融CRM系统项目', stageId: stages[3].id, amount: 580000, expectedCloseDate: daysLater(30), probability: 70, notes: '大项目，需要重点跟进', createdAt: daysAgo(45), updatedAt: daysAgo(5) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[1].id, ownerId: repId1, name: '恒通物流销售管理系统', stageId: stages[2].id, amount: 320000, expectedCloseDate: daysLater(45), probability: 50, notes: '方案阶段', createdAt: daysAgo(35), updatedAt: daysAgo(8) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[2].id, ownerId: repId2, name: '盛世医药CRM升级项目', stageId: stages[4].id, amount: 450000, expectedCloseDate: daysAgo(5), probability: 100, notes: '已签约', createdAt: daysAgo(60), updatedAt: daysAgo(5) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[3].id, ownerId: repId2, name: '优品电商客户运营系统', stageId: stages[1].id, amount: 280000, expectedCloseDate: daysLater(60), probability: 30, notes: '需求确认中', createdAt: daysAgo(20), updatedAt: daysAgo(3) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[4].id, ownerId: repId3, name: '精工制造数字化销售平台', stageId: stages[2].id, amount: 680000, expectedCloseDate: daysLater(50), probability: 45, notes: '大型项目，涉及多部门', createdAt: daysAgo(40), updatedAt: daysAgo(10) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[6].id, ownerId: repId1, name: '蓝天航空客户服务系统', stageId: stages[4].id, amount: 1200000, expectedCloseDate: daysAgo(10), probability: 100, notes: '年度大项目', createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[5].id, ownerId: repId3, name: '智慧教育CRM咨询项目', stageId: stages[0].id, amount: 150000, expectedCloseDate: daysLater(90), probability: 20, notes: '初步接触', createdAt: daysAgo(10), updatedAt: daysAgo(10) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[0].id, ownerId: repId1, name: '华信金融二期项目', stageId: stages[0].id, amount: 350000, expectedCloseDate: daysLater(75), probability: 25, notes: '一期交付后二期意向', createdAt: daysAgo(5), updatedAt: daysAgo(5) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[7].id, ownerId: repId2, name: '绿洲环保客户管理系统', stageId: stages[5].id, amount: 200000, expectedCloseDate: daysAgo(15), probability: 0, notes: '竞争对手低价中标', createdAt: daysAgo(50), updatedAt: daysAgo(15) },
  ];

  for (const opp of opportunities) {
    await tx.objectStore('opportunities').put(opp);
  }

  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i];
    const history: StageHistory = {
      id: generateId(),
      opportunityId: opp.id,
      tenantId: tenantId1,
      fromStageId: i < 3 ? stages[0].id : undefined,
      toStageId: opp.stageId,
      changedById: opp.ownerId,
      changedAt: opp.updatedAt,
    };
    await tx.objectStore('stageHistories').put(history);
  }

  const activities: Activity[] = [
    { id: generateId(), tenantId: tenantId1, customerId: customers[0].id, opportunityId: opportunities[0].id, userId: repId1, type: 'call', content: '电话沟通项目需求，客户对CRM系统表现出浓厚兴趣', createdAt: daysAgo(2) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[0].id, opportunityId: opportunities[0].id, userId: repId1, type: 'visit', content: '上门拜访，演示系统功能，客户反馈良好', createdAt: daysAgo(7) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[0].id, userId: repId1, type: 'email', content: '发送项目报价方案', createdAt: daysAgo(12) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[2].id, opportunityId: opportunities[2].id, userId: repId2, type: 'meeting', content: '签约会议，项目正式启动', createdAt: daysAgo(5) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[2].id, userId: repId2, type: 'call', content: '需求确认电话', createdAt: daysAgo(15) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[1].id, opportunityId: opportunities[1].id, userId: repId1, type: 'email', content: '发送技术方案文档', createdAt: daysAgo(8) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[6].id, opportunityId: opportunities[5].id, userId: repId1, type: 'meeting', content: '项目验收会议，客户满意', createdAt: daysAgo(10) },
    { id: generateId(), tenantId: tenantId1, customerId: customers[4].id, opportunityId: opportunities[4].id, userId: repId3, type: 'visit', content: '拜访客户，了解业务流程', createdAt: daysAgo(10) },
  ];

  for (const activity of activities) {
    await tx.objectStore('activities').put(activity);
  }

  const salesTargets: SalesTarget[] = [
    { id: generateId(), userId: repId1, tenantId: tenantId1, period: 'month', periodValue: '2026-06', targetAmount: 800000, createdAt: daysAgo(30) },
    { id: generateId(), userId: repId2, tenantId: tenantId1, period: 'month', periodValue: '2026-06', targetAmount: 600000, createdAt: daysAgo(30) },
    { id: generateId(), userId: repId3, tenantId: tenantId1, period: 'month', periodValue: '2026-06', targetAmount: 500000, createdAt: daysAgo(30) },
    { id: generateId(), userId: repId1, tenantId: tenantId1, period: 'quarter', periodValue: '2026-Q2', targetAmount: 2000000, createdAt: daysAgo(90) },
    { id: generateId(), userId: repId2, tenantId: tenantId1, period: 'quarter', periodValue: '2026-Q2', targetAmount: 1500000, createdAt: daysAgo(90) },
    { id: generateId(), userId: repId3, tenantId: tenantId1, period: 'quarter', periodValue: '2026-Q2', targetAmount: 1200000, createdAt: daysAgo(90) },
  ];

  for (const target of salesTargets) {
    await tx.objectStore('salesTargets').put(target);
  }

  await tx.done;
}

export async function isDatabaseSeeded(): Promise<boolean> {
  const db = getDB();
  const count = await db.countFromIndex('users', 'by-email');
  return count > 0;
}
