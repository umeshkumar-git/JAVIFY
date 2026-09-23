import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * User Schema — Enterprise MongoDB Schema for JAVIFY
 *
 * Design Decisions:
 * 1. Security First: `passwordHash` is excluded (`select: false`) by default to prevent credential leakage.
 * 2. Soft Delete: `isDeleted` with pre-find hooks automatically omits soft-deleted records from standard queries.
 * 3. Compound Indexes: Optimized for user lookup and role-filtered pagination.
 */
const UserSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, "Email address is required"],
			unique: true,
			lowercase: true,
			trim: true,
			match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
			index: true,
		},
		username: {
			type: String,
			required: [true, "Username is required"],
			unique: true,
			trim: true,
			minlength: [3, "Username must be at least 3 characters"],
			maxlength: [30, "Username cannot exceed 30 characters"],
			match: [/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"],
			index: true,
		},
		displayName: {
			type: String,
			trim: true,
			maxlength: [50, "Display name cannot exceed 50 characters"],
		},
		passwordHash: {
			type: String,
			required: [true, "Password hash is required"],
			select: false, // Hidden by default in queries
		},
		avatarUrl: {
			type: String,
			trim: true,
			default: null,
		},
		role: {
			type: String,
			enum: {
				values: ["USER", "CREATOR", "ADMIN"],
				message: "{VALUE} is not a recognized user role",
			},
			default: "USER",
		},
		preferences: {
			audioQuality: {
				type: String,
				enum: ["AUTO", "NORMAL", "HIGH", "LOSSLESS"],
				default: "AUTO",
			},
			volumeNormalization: {
				type: Boolean,
				default: true,
			},
			theme: {
				type: String,
				enum: ["dark", "light", "cyberpunk"],
				default: "dark",
			},
		},
		// Soft Delete Architecture
		isDeleted: {
			type: Boolean,
			default: false,
			index: true,
		},
		deletedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true, // Auto-generates createdAt and updatedAt
		toJSON: {
			virtuals: true,
			transform: (_doc, ret) => {
				delete ret.passwordHash;
				delete ret.__v;
				return ret;
			},
		},
		toObject: { virtuals: true },
	},
);

// =========================================================================
// INDEXES
// =========================================================================

// Compound index for role-based administrative queries sorted by creation
UserSchema.index({ role: 1, isDeleted: 1, createdAt: -1 });

// =========================================================================
// MIDDLEWARE (SOFT DELETE FILTERING)
// =========================================================================

// Auto-exclude soft-deleted records from find queries unless explicit
UserSchema.pre(/^find/, function () {
	// If query explicitly sets isDeleted, respect caller; otherwise filter out deleted
	if (this.getQuery().isDeleted === undefined) {
		this.where({ isDeleted: false });
	}
});

// =========================================================================
// INSTANCE METHODS
// =========================================================================

/**
 * Soft deletes the user record and records timestamp
 */
UserSchema.methods.softDelete = async function () {
	this.isDeleted = true;
	this.deletedAt = new Date();
	return this.save();
};

/**
 * Restores a soft-deleted user record
 */
UserSchema.methods.restore = async function () {
	this.isDeleted = false;
	this.deletedAt = null;
	return this.save();
};

export const User = model("User", UserSchema);
export default User;
