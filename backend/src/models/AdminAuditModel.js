import mongoose from 'mongoose';

const AdminAuditSchema = new mongoose.Schema({
  actor_user_id: { type: String, required: true, index: true },
  actor_username: { type: String, required: true, maxlength: 80 },
  action: { type: String, enum: ['user.role.updated', 'user.deleted'], required: true, index: true },
  target_user_id: { type: String, required: true, index: true },
  target_username: { type: String, required: true, maxlength: 80 },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  request_id: { type: String, default: null, maxlength: 64 },
}, {
  collection: 'admin_audit_logs',
  timestamps: { createdAt: 'created_at', updatedAt: false },
});

AdminAuditSchema.index({ created_at: -1, _id: -1 });

export const AdminAuditLog = mongoose.models.AdminAuditLog
  || mongoose.model('AdminAuditLog', AdminAuditSchema);

export async function recordAdminAudit(event) {
  try {
    await AdminAuditLog.create(event);
  } catch (error) {
    // An audit-store outage should not make a completed admin action appear to have failed.
    console.error('Failed to persist admin audit event:', error.message);
  }
}
