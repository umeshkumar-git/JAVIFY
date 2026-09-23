import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * Track Schema — Enterprise Audio Track Schema for JAVIFY
 *
 * Design Decisions:
 * 1. High-Performance Compound Indexing:
 *    - `{ artist: 1, title: 1 }` enables O(log N) prefix searches across artist and song title.
 *    - `{ genre: 1, playCount: -1 }` accelerates recommendation and popular genre queries.
 *    - Full-text search compound index with weighted fields for natural language search.
 * 2. Soft Delete: `isDeleted` with transparent pre-find query hooks.
 * 3. Audio Telemetry: Stores duration (seconds), bitrate, audioUrl, and waveform peaks for instant visualizer rendering.
 */
const TrackSchema = new Schema(
	{
		title: {
			type: String,
			required: [true, "Track title is required"],
			trim: true,
			maxlength: [200, "Title cannot exceed 200 characters"],
		},
		artist: {
			type: String,
			required: [true, "Artist name is required"],
			trim: true,
			maxlength: [200, "Artist cannot exceed 200 characters"],
		},
		album: {
			type: String,
			trim: true,
			default: "Single",
			maxlength: [200, "Album cannot exceed 200 characters"],
		},
		duration: {
			type: Number,
			required: [true, "Track duration in seconds is required"],
			min: [0, "Duration must be a positive number"],
		},
		audioUrl: {
			type: String,
			required: [true, "Audio stream URL is required"],
			trim: true,
		},
		coverUrl: {
			type: String,
			trim: true,
			default: null,
		},
		genre: {
			type: String,
			trim: true,
			lowercase: true,
			default: "other",
		},
		bitrate: {
			type: Number,
			default: 320, // kbps
		},
		format: {
			type: String,
			enum: ["MP3", "FLAC", "AAC", "WAV", "OGG"],
			default: "MP3",
		},
		waveformPeaks: {
			type: [Number],
			default: [], // Normalized amplitudes for instantaneous 60fps canvas visualizer
		},
		playCount: {
			type: Number,
			default: 0,
			min: [0, "Play count cannot be negative"],
		},
		uploadedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: [true, "Uploader user reference is required"],
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
// COMPOUND INDEXES (OPTIMIZED FOR HIGH-THROUGHPUT SEARCH & RANKING)
// =========================================================================

// 1. Primary compound index for artist & title query filtering and sort
TrackSchema.index({ artist: 1, title: 1, isDeleted: 1 });

// 2. Compound index for genre exploration ordered by popularity
TrackSchema.index({ genre: 1, playCount: -1, isDeleted: 1 });

// 3. Compound index for uploader catalogue queries
TrackSchema.index({ uploadedBy: 1, isDeleted: 1, createdAt: -1 });

// 4. Text index for fuzzy natural language search queries
TrackSchema.index(
	{ title: "text", artist: "text", album: "text" },
	{
		weights: { title: 10, artist: 5, album: 1 },
		name: "TrackTextSearchIndex",
	},
);

// =========================================================================
// MIDDLEWARE (SOFT DELETE FILTERING)
// =========================================================================

TrackSchema.pre(/^find/, function () {
	if (this.getQuery().isDeleted === undefined) {
		this.where({ isDeleted: false });
	}
});

// =========================================================================
// INSTANCE METHODS
// =========================================================================

TrackSchema.methods.softDelete = async function () {
	this.isDeleted = true;
	this.deletedAt = new Date();
	return this.save();
};

TrackSchema.methods.incrementPlayCount = async function () {
	return this.updateOne({ $inc: { playCount: 1 } });
};

export const Track = model("Track", TrackSchema);
export default Track;
