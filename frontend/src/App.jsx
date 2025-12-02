import { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE || "/posts").replace(/\/$/, "");

const initialFormState = { title: "", category: "", tags: "", content: "" };

function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
}

function parseTags(text) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { text, type }
  const [view, setView] = useState("list"); // list | form | detail
  const [formMode, setFormMode] = useState("create"); // create | edit
  const [currentPost, setCurrentPost] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [term, setTerm] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  const preview = useMemo(() => {
    const tags = parseTags(form.tags);
    return {
      title: form.title || "Post title will appear here",
      category: form.category || "No category",
      tags,
      content: form.content || "Start typing content to see the live preview.",
      isEmpty: !form.title && !form.content,
    };
  }, [form]);

  async function fetchPosts(searchTerm = "") {
    setLoading(true);
    const params = searchTerm ? `?term=${encodeURIComponent(searchTerm)}` : "";
    try {
      const res = await fetch(`${API_BASE}/${params}`);
      if (!res.ok) throw new Error("Failed to load posts");
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      flash("Error loading posts.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadSinglePost(id) {
    try {
      const res = await fetch(`${API_BASE}/${id}/`);
      if (res.status === 404) {
        flash("Post not found.", "error");
        setView("list");
        return;
      }
      if (!res.ok) throw new Error("Failed to load post");
      const data = await res.json();
      setCurrentPost(data);
      setView("detail");
    } catch (err) {
      console.error(err);
      flash("Error loading post.", "error");
    }
  }

  function flash(text, type = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 2500);
  }

  function resetForm() {
    setForm(initialFormState);
  }

  function openCreate() {
    setFormMode("create");
    resetForm();
    setCurrentPost(null);
    setView("form");
  }

  function openEdit(post) {
    setFormMode("edit");
    setCurrentPost(post);
    setForm({
      title: post.title || "",
      category: post.category || "",
      tags: (post.tags || []).join(", "),
      content: post.content || "",
    });
    setView("form");
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this post?")) return;
    try {
      const res = await fetch(`${API_BASE}/${id}/`, { method: "DELETE" });
      if (res.status === 204) {
        flash("Post deleted.");
        setView("list");
        fetchPosts(term);
      } else if (res.status === 404) {
        flash("Post not found.", "error");
      } else {
        flash("Failed to delete post.", "error");
      }
    } catch (err) {
      console.error(err);
      flash("Error deleting post.", "error");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category.trim(),
      tags: parseTags(form.tags),
    };
    if (!payload.title || !payload.content) {
      flash("Title and content are required.", "error");
      return;
    }

    try {
      let res;
      if (formMode === "create") {
        res = await fetch(`${API_BASE}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/${currentPost.id}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (formMode === "create" && res.status === 201) {
        const newPost = await res.json();
        flash("Post created.");
        setCurrentPost(newPost);
        setView("detail");
        fetchPosts(term);
      } else if (formMode === "edit" && res.status === 200) {
        const updated = await res.json();
        flash("Post updated.");
        setCurrentPost(updated);
        setView("detail");
        fetchPosts(term);
      } else if (res.status === 400) {
        const data = await res.json();
        flash("Validation error: " + JSON.stringify(data.errors || data), "error");
      } else if (res.status === 404) {
        flash("Post not found.", "error");
      } else {
        flash("Failed to save post.", "error");
      }
    } catch (err) {
      console.error(err);
      flash("Error saving post.", "error");
    }
  }

  function renderTags(tags) {
    return (
      <div>
        {(tags || []).map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
    );
  }

  function renderList() {
    return (
      <section className="surface">
        <div className="toolbar">
          <div className="search-group">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, content or category..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPosts(term)}
            />
          </div>
          <button onClick={() => fetchPosts(term)}>Search</button>
          <button
            className="btn-secondary"
            onClick={() => {
              setTerm("");
              fetchPosts("");
            }}
          >
            Clear
          </button>
        </div>

        <div id="posts-container">
          {loading ? (
            <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>Loading…</p>
          ) : posts.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>No posts yet. Click "+ New Post" to create one.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="card">
                <div className="card-header-row">
                  <h3 className="card-title" onClick={() => loadSinglePost(post.id)}>
                    {post.title}
                  </h3>
                  <div className="card-category-pill">{post.category || "Uncategorized"}</div>
                </div>
                <div className="card-meta">Created: {formatDate(post.createdAt)}</div>
                <div className="card-content">
                  {(post.content || "").slice(0, 150)}
                  {(post.content || "").length > 150 ? "…" : ""}
                </div>
                {renderTags(post.tags)}
                <div className="card-actions">
                  <button onClick={() => loadSinglePost(post.id)}>View</button>
                  <button onClick={() => openEdit(post)}>Edit</button>
                  <button className="delete" onClick={() => handleDelete(post.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  function renderForm() {
    return (
      <section className="surface" style={{ marginTop: "0.75rem" }}>
        <h2 id="form-title">{formMode === "create" ? "Create New Post" : "Edit Post"}</h2>
        <div className="form-layout">
          <form id="post-form" onSubmit={handleSubmit}>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <label htmlFor="category">Category</label>
            <input
              id="category"
              type="text"
              placeholder="e.g. Technology"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />

            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              id="tags"
              type="text"
              placeholder="Tech, Programming"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />

            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              placeholder="Write your blog post content here..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Save
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (currentPost) {
                    setView("detail");
                  } else {
                    setView("list");
                  }
                }}
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="preview-card">
            <div className="preview-label">Preview</div>
            <h3 id="preview-title" className={preview.isEmpty ? "preview-empty" : ""}>
              {preview.title}
            </h3>
            <div id="preview-meta" className={`preview-meta ${preview.tags.length ? "" : "preview-empty"}`}>
              {`${preview.category} • ${preview.tags.length ? preview.tags.join(", ") : "no tags"}`}
            </div>
            <div id="preview-tags">{renderTags(preview.tags)}</div>
            <hr />
            <div id="preview-content" className={`preview-content ${preview.isEmpty ? "preview-empty" : ""}`}>
              {preview.content}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderDetail() {
    if (!currentPost) return null;
    return (
      <section className="surface" style={{ marginTop: "0.75rem" }}>
        <button className="pill-soft small" id="btn-back-to-list" onClick={() => setView("list")}>
          ← Back to all posts
        </button>
        <h2 id="detail-title">{currentPost.title}</h2>
        <div id="detail-meta">
          Category: {currentPost.category || "N/A"} • Created: {formatDate(currentPost.createdAt)} • Updated:{" "}
          {formatDate(currentPost.updatedAt)}
        </div>
        <div id="detail-tags">{renderTags(currentPost.tags)}</div>
        <div id="detail-content">{currentPost.content}</div>
        <div className="form-actions">
          <button className="btn-primary" onClick={() => openEdit(currentPost)}>
            Edit
          </button>
          <button className="btn-secondary" onClick={() => handleDelete(currentPost.id)}>
            Delete
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <h1>Blog Admin</h1>
          <p>Simple dashboard to manage posts from your Django REST API.</p>
        </div>
        <button id="btn-new-post-header" className="btn-primary" onClick={openCreate}>
          + New Post
        </button>
      </header>

      {message && (
        <div id="message" className={message.type === "error" ? "error" : "success"}>
          {message.text}
        </div>
      )}

      {view === "list" && renderList()}
      {view === "form" && renderForm()}
      {view === "detail" && renderDetail()}
    </div>
  );
}
