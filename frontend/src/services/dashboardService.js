import api from "./api";

const getTotal = (response) => response.data.pagination?.total ?? 0;

export const getDashboardData = async (role) => {
  const [
    recentPostsResponse,
    totalPostsResponse,
    publishedPostsResponse,
    draftPostsResponse,
    categoriesResponse,
    tagsResponse,
  ] = await Promise.all([
    api.get("/posts", { params: { limit: 5 } }),
    api.get("/posts", { params: { limit: 1 } }),
    api.get("/posts", {
      params: { status: "published", limit: 1 },
    }),
    api.get("/posts", {
      params: { status: "draft", limit: 1 },
    }),
    api.get("/categories", { params: { limit: 1 } }),
    api.get("/tags", { params: { limit: 1 } }),
  ]);

  return {
    recentPosts: recentPostsResponse.data.data || [],
    totalPosts: getTotal(totalPostsResponse),
    publishedPosts: getTotal(publishedPostsResponse),
    draftPosts: getTotal(draftPostsResponse),
    totalCategories: getTotal(categoriesResponse),
    totalTags: getTotal(tagsResponse),
    role,
  };
};
