import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * PlaylistItemSubSchema
 *
 * Demonstrates enterprise NoSQL relational patterns:
 * In high-scale music applications (e.g. Spotify), a playlist preserves:
 * 1. Track reference (`Schema.Types.ObjectId` pointing to `Track`).
 * 2. Temporal audit (`addedAt`) for sorting tracks by "Recently Added".
 * 3. Collaborative attribution (`addedBy`) for shared multi-user playlists.
 */
const PlaylistItemSchema = new Schema(
	{
		track: {
			type: Schema.Types.ObjectId,
			ref: "Track",
			required: [true, "Track reference is required"],
		},
		addedAt: {
			type: Date,
			default: Date.now,
		},
		addedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ _id: false }, // Prevent unnecessary nested ObjectIds for array items
);

/**
 * Playlist Schema — Enterprise MongoDB Schema for JAVIFY
 *
 * Design Decisions:
 * 1. Normalized Relational References: Tracks are referenced by `Schema.Types.ObjectId`.
 * 2. Read-Optimized Denormalization: Caches `trackCount` and `totalDuration` directly
 *    on the playlist document so browsing/listing playlists requires ZERO expensive `$lookup` joins.
 * 3. Compound Indexes:
 *    - `{ owner: 1, isDeleted: 1, updatedAt: -1 }` gives instant O(1) user library loads.
 *    - `{ isPublic: 1, isDeleted: 1, followersCount: -1 }` drives public playlist exploration.
 * 4. Transparent Soft Delete:
 *    - Automatic query hook omits soft-deleted playlists.
 */
const PlaylistSchema = new Schema(
	{
		name: {
			type: String,
			required: [true, "Playlist name is required"],
			trim: true,
			maxlength: [100, "Playlist name cannot exceed 100 characters"],
		},
		description: {
			type: String,
			trim: true,
			maxlength: [500, "Description cannot exceed 500 characters"],
			default: "",
		},
		coverUrl: {
			type: String,
			trim: true,
			default: null,
		},
		owner: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: [true, "Playlist must have an owner"],
			index: true,
		},
		isPublic: {
			type: Boolean,
			default: true,
			index: true,
		},
		collaborators: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		// Referenced Tracks Array
		tracks: {
			type: [PlaylistItemSchema],
			default: [],
		},
		// Denormalized counters for lightning-fast catalog queries
		trackCount: {
			type: Number,
			default: 0,
			min: [0, "Track count cannot be negative"],
		},
		totalDuration: {
			type: Number,
			default: 0, // In seconds
			min: [0, "Total duration cannot be negative"],
		},
		followersCount: {
			type: Number,
			default: 0,
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
		timestamps: true,
		toJSON: {
			virtuals: true,
			transform: (_doc, ret) => {
				delete ret.__v;
				return ret;
			},
		},
		toObject: { virtuals: true },
	},
);

// =========================================================================
// COMPOUND INDEXES
// =========================================================================

// 1. Compound index for querying user playlists sorted by recent activity
PlaylistSchema.index({ owner: 1, isDeleted: 1, updatedAt: -1 });

// 2. Compound index for public playlist discovery ordered by popularity
PlaylistSchema.index({ isPublic: 1, isDeleted: 1, followersCount: -1 });

// 3. Multikey index for finding which playlists contain a specific track
PlaylistSchema.index({ "tracks.track": 1, isDeleted: 1 });

// =========================================================================
// MIDDLEWARE (PRE-SAVE DENORMALIZATION & SOFT DELETE)
// =========================================================================

// Keep `trackCount` synchronized with the tracks array length
PlaylistSchema.pre("save", function () {
	if (this.isModified("tracks")) {
		this.trackCount = this.tracks.length;
	}
});

// Auto-exclude soft-deleted records from find queries
PlaylistSchema.pre(/^find/, function () {
	if (this.getQuery().isDeleted === undefined) {
		this.where({ isDeleted: false });
	}
});

// =========================================================================
// INSTANCE METHODS
// =========================================================================

/**
 * Soft deletes the playlist
 */
PlaylistSchema.methods.softDelete = async function () {
	this.isDeleted = true;
	this.deletedAt = new Date();
	return this.save();
};

/**
 * Adds a track reference and updates total duration atomically
 */
PlaylistSchema.methods.addTrack = async function (trackId, userId, trackDuration = 0) {
	this.tracks.push({
		track: trackId,
		addedAt: new Date(),
		addedBy: userId,
	});
	this.trackCount = this.tracks.length;
	this.totalDuration += trackDuration;
	return this.save();
};

/**
 * Removes a track reference and updates total duration atomically
 */
PlaylistSchema.methods.removeTrack = async function (trackId, trackDuration = 0) {
	this.tracks = this.tracks.filter(
		(item) => item.track.toString() !== trackId.toString(),
	);
	this.trackCount = this.tracks.length;
	this.totalDuration = Math.max(0, this.totalDuration - trackDuration);
	return this.save();
};

export const Playlist = model("Playlist", PlaylistSchema);
export default Playlist;
