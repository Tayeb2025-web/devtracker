import mongoose from 'mongoose';
import { DEFAULT_USER_ID } from '../config/constants.js';
import { getTargetUserIds } from '../utils/userHelper.js';

const ProjectSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#8B5CF6' },
  description: { type: String, default: null },
  total_hours: { type: Number, default: 0 },
  legacy_id: { type: Number, index: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
});

ProjectSchema.virtual('id').get(function () {
  return this._id.toString();
});

export const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

export const ProjectModel = {
  async findAll(userId = DEFAULT_USER_ID) {
    const userIds = await getTargetUserIds(userId);
    const list = await Project.find({
      user_id: { $in: userIds }
    }).sort({ name: 1 }).lean();
    return list.map(item => ({ ...item, id: item._id.toString() }));
  },

  async findById(id, userId = DEFAULT_USER_ID) {
    if (!id) return null;
    const userIds = await getTargetUserIds(userId);
    let project;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      project = await Project.findOne({
        _id: id,
        user_id: { $in: userIds }
      }).lean();
    }
    if (!project) {
      project = await Project.findOne({
        legacy_id: Number(id) || -1,
        user_id: { $in: userIds }
      }).lean();
    }
    if (project) project.id = project._id.toString();
    return project;
  },

  async create(data, userId = DEFAULT_USER_ID) {
    const { name, color = '#8B5CF6', description = null } = data;
    const created = await Project.create({
      user_id: String(userId),
      name,
      color,
      description: description || null,
    });
    return this.findById(created._id, userId);
  },

  async update(id, data, userId = DEFAULT_USER_ID) {
    const allowedFields = ['name', 'color', 'description'];
    const updateData = {};
    allowedFields.forEach(key => {
      if (data[key] !== undefined) updateData[key] = data[key];
    });

    const userIds = await getTargetUserIds(userId);
    let updated;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      updated = await Project.findOneAndUpdate(
        { _id: id, user_id: { $in: userIds } },
        updateData,
        { new: true }
      ).lean();
    }
    if (!updated) {
      updated = await Project.findOneAndUpdate(
        { legacy_id: Number(id) || -1, user_id: { $in: userIds } },
        updateData,
        { new: true }
      ).lean();
    }
    if (updated) updated.id = updated._id.toString();
    return updated;
  },

  async delete(id, userId = DEFAULT_USER_ID) {
    const project = await this.findById(id, userId);
    if (!project) return false;
    const result = await Project.deleteOne({ _id: project._id });
    return result.deletedCount > 0;
  },

  async updateTotalHours(id, hours, userId = DEFAULT_USER_ID) {
    const project = await this.findById(id, userId);
    if (!project) return;
    await Project.updateOne(
      { _id: project._id },
      { $inc: { total_hours: Number(hours) || 0 } }
    );
  },

  async recalculateHours(userId = DEFAULT_USER_ID) {
    const { StudySession } = await import('./SessionModel.js');
    const userIds = await getTargetUserIds(userId);
    const projects = await this.findAll(userId);
    for (const project of projects) {
      const agg = await StudySession.aggregate([
        {
          $match: {
            $or: [
              { project_id: project.id },
              { project_id: String(project.legacy_id || -1) }
            ],
            user_id: { $in: userIds }
          }
        },
        { $group: { _id: null, total: { $sum: '$duration_hours' } } }
      ]);
      const total = agg[0]?.total || 0;
      await Project.updateOne({ _id: project._id }, { total_hours: parseFloat(total.toFixed(4)) });
    }
  },
};
