import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export default function Dashboard({ onLogout }) {
  const [redditData, setRedditData] = useState(null);
  // Removed direct YouTube stats by ID; we'll use search results only
  const [loading, setLoading] = useState(false);
  const [subreddit, setSubreddit] = useState('technology');
  const [activeTab, setActiveTab] = useState('reddit'); // 'reddit' | 'youtube' | 'instagram'

  // Channel search state
  const [channelQuery, setChannelQuery] = useState('Kurzgesagt');
  const [sortBy, setSortBy] = useState('subscribers'); // name | subscribers | total_views
  const [order, setOrder] = useState('desc'); // asc | desc
  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Instagram state
  const [igUrl, setIgUrl] = useState('https://www.instagram.com/therock/');
  const [igData, setIgData] = useState(null);
  const [igLoading, setIgLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cleanSub = (subreddit || '').trim().replace(/\s+/g, '');
      const redditRes = await api.get(`/api/insights/reddit?subreddit=${cleanSub}`);
      setRedditData(redditRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [subreddit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const searchChannels = async () => {
    if (!channelQuery || channelQuery.length < 2) return;
    setLoadingChannels(true);
    try {
      const res = await api.get('/api/insights/youtube/channels', {
        params: { q: channelQuery, max_results: 10, sort: sortBy, order }
      });
      setChannels(res.data.channels || []);
    } catch (e) {
      setChannels([]);
      console.error('Channel search error', e);
    } finally {
      setLoadingChannels(false);
    }
  };

  const fetchInstagram = async () => {
    if (!igUrl || !igUrl.startsWith('http')) return;
    setIgLoading(true);
    try {
      const res = await api.get('/api/insights/instagram/community', { params: { url: igUrl } });
      setIgData(res.data);
    } catch (e) {
      console.error('Instagram fetch error', e);
      setIgData({ error: 'Failed to fetch Instagram data' });
    } finally {
      setIgLoading(false);
    }
  };

  return (
    <div className="page">
      <nav className="navbar">
        <div className="nav-inner">
          <h1 className="nav-title">Social Media Insights</h1>
          <button onClick={onLogout} className="logout">Logout</button>
        </div>
      </nav>
      <div className="container">
        {/* Tabs */}
        <div className="tabs">
          <div className={`tab ${activeTab === 'reddit' ? 'active' : ''}`} onClick={() => setActiveTab('reddit')}>Reddit</div>
          <div className={`tab ${activeTab === 'youtube' ? 'active' : ''}`} onClick={() => setActiveTab('youtube')}>YouTube</div>
          <div className={`tab ${activeTab === 'instagram' ? 'active' : ''}`} onClick={() => setActiveTab('instagram')}>Instagram</div>
        </div>

        {/* Reddit Tab */}
        {activeTab === 'reddit' && (
          <>
            <div className="panel">
              <h2 className="panel-title">Reddit Search</h2>
              <div className="grid" style={{ marginBottom: 8 }}>
                <input type="text" placeholder="Subreddit (no spaces, e.g. ArtificialIntelligence)" value={subreddit} onChange={(e) => setSubreddit(e.target.value)} className="input" />
              </div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>Tip: subreddit names cannot contain spaces. We’ll auto-remove spaces when searching.</p>
              <button onClick={fetchData} disabled={loading} className="btn-primary">{loading ? 'Loading...' : 'Fetch Subreddit'}</button>
            </div>

            <div className="card-block">
              <h3 className="heading-orange">Reddit</h3>
              {redditData && !redditData.error ? (
                <>
                  <p className="muted" style={{ marginBottom: 12 }}>r/{redditData.subreddit}</p>
                  {Array.isArray(redditData.posts) && redditData.posts.length > 0 ? (
                    <div>
                      {redditData.posts.slice(0, 5).map((post, i) => (
                        <div key={i} className="post">
                          <p style={{ fontWeight: 600, fontSize: 14 }}>{post.title}</p>
                          <p className="muted" style={{ fontSize: 12 }}>↑ {post.score} | 💬 {post.comments}</p>
                          {post.url && (
                            <a className="btn-link" href={post.url} target="_blank" rel="noreferrer">Open Thread</a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">{redditData.message || 'No subreddit found or no posts available.'}</p>
                  )}
                </>
              ) : (
                <p className="muted">{redditData?.error || 'Loading...'}</p>
              )}
            </div>
          </>
        )}

        {/* Instagram Tab */}
        {activeTab === 'instagram' && (
          <>
            <div className="panel">
              <h2 className="panel-title">Instagram Community</h2>
              <div className="grid" style={{ marginBottom: 16 }}>
                <input type="text" placeholder="Profile URL (e.g. https://www.instagram.com/therock/)" value={igUrl} onChange={(e) => setIgUrl(e.target.value)} className="input" />
              </div>
              <button onClick={fetchInstagram} disabled={igLoading} className="btn-primary">{igLoading ? 'Fetching...' : 'Fetch Community'}</button>
            </div>

            <div className="panel">
              <h2 className="panel-title">Result</h2>
              {igData ? (
                <>
                  {igData.error ? (
                    <p className="muted">{igData.error}</p>
                  ) : (
                    <>
                      {igData.profile_url && (
                        <div style={{ marginBottom: 12 }}>
                          <a className="btn-link" href={igData.profile_url} target="_blank" rel="noreferrer">Open Profile</a>
                        </div>
                      )}
                      <pre style={{ whiteSpace: 'pre-wrap', background: '#f9fafb', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        {JSON.stringify(igData.data || igData, null, 2)}
                      </pre>
                    </>
                  )}
                </>
              ) : (
                <p className="muted">No data yet. Enter a profile URL and click Fetch Community.</p>
              )}
            </div>
          </>
        )}

        {/* YouTube Tab */}
        {activeTab === 'youtube' && (
          <>
            <div className="panel">
              <h2 className="panel-title">YouTube Channel Search (by name)</h2>
              <div className="grid" style={{ marginBottom: 16 }}>
                <input type="text" placeholder="e.g. Kurzgesagt" value={channelQuery} onChange={(e) => setChannelQuery(e.target.value)} className="input" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input">
                    <option value="name">Name</option>
                    <option value="subscribers">Subscribers</option>
                    <option value="total_views">Total Views</option>
                  </select>
                  <select value={order} onChange={(e) => setOrder(e.target.value)} className="input">
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                </div>
              </div>
              <button onClick={searchChannels} disabled={loadingChannels} className="btn-primary">{loadingChannels ? 'Searching...' : 'Search Channels'}</button>
            </div>

            {channels && channels.length > 0 && (
              <div className="panel">
                <h2 className="panel-title">Results ({channels.length})</h2>
                <div>
                  {channels.map((ch) => (
                    <div key={ch.channel_id} className="card-block" style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      {ch.thumbnail && <img src={ch.thumbnail} alt={ch.channel_name} width={56} height={56} style={{ borderRadius: 8 }} />}
                      <div>
                        <div style={{ fontWeight: 600 }}>{ch.channel_name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>Subs: {ch.subscribers?.toLocaleString?.() || ch.subscribers} • Views: {ch.total_views?.toLocaleString?.() || ch.total_views} • Videos: {ch.total_videos}</div>
                      </div>
                      <a className="btn-link" href={`https://www.youtube.com/channel/${ch.channel_id}`} target="_blank" rel="noreferrer">Open Channel</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
