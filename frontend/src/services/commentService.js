import api from "./api";

// Get comments belonging to a specific post
export const getCommentsByPost = async (postId, params = {}) => {
  const response = await api.get(`/posts/${postId}/comments`, {
    params,
  });

  return {
    comments: response.data.data || [],
    pagination: response.data.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  };
};

// Update a comment's content or moderation status
export const updateComment = async (commentId, commentData) => {
  const response = await api.patch(`/comments/${commentId}`, commentData);

  return response.data;
};

// Delete a comment
export const deleteComment = async (commentId) => {
  const response = await api.delete(`/comments/${commentId}`);

  return response.data;
};
