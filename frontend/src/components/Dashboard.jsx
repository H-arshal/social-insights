import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export default function Dashboard({ onLogout }) {
  const [redditData, setRedditData] = useState(null);
  // Removed direct YouTube stats by ID; we'll use search results only
  const [loading, setLoading] = useState(false);
  const [subreddit, setSubreddit] = useState('technology');
  const [activeTab, setActiveTab] = useState('reddit'); // 'reddit' | 'youtube' | 'linkedin'

  // Channel search state
  const [channelQuery, setChannelQuery] = useState('Kurzgesagt');
  const [sortBy, setSortBy] = useState('subscribers'); // name | subscribers | total_views
  const [order, setOrder] = useState('desc'); // asc | desc
  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // LinkedIn state
  const [companyName, setCompanyName] = useState('google');
  const [companyData, setCompanyData] = useState(null);
  const [companyView, setCompanyView] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(false);

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

  const searchCompany = async () => {
    if (!companyName || companyName.trim().length < 1) return;
    setLoadingCompany(true);
    try {
      const res = await api.get('/api/insights/linkedin/company', { params: { name: companyName.trim() } });
      setCompanyData(res.data);
      const raw = res.data?.data || res.data; // wrapper returns {query, data}
      const d = raw?.data || raw; // some providers nest under data.data
      const cleaned = {
        name: d?.companyName || d?.name || companyName.trim(),
        about: d?.about || d?.description || '',
        industry: d?.industry || d?.industryName || '',
        organizationType: d?.organizationType || d?.orgType || '',
        employees: d?.employees || d?.employeeCount || d?.size || null,
        followers: d?.followers || d?.followersCount || null,
        funding: d?.funding || null,
        headquarters: d?.headquarters || d?.hq || d?.location || '',
        website: d?.website || d?.websiteUrl || '',
        linkedin: d?.linkedinUrl || d?.profileUrl || '',
        specialties: d?.specialities || d?.specialties || [],
        locations: Array.isArray(d?.locations) ? d.locations.slice(0, 5) : (d?.locations ? [d.locations] : [])
      };
      setCompanyView(cleaned);
    } catch (e) {
      setCompanyData({ error: 'Failed to fetch company data' });
      setCompanyView(null);
      console.error('LinkedIn company error', e);
    } finally {
      setLoadingCompany(false);
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
          <div className={`tab ${activeTab === 'linkedin' ? 'active' : ''}`} onClick={() => setActiveTab('linkedin')}>LinkedIn</div>
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

        {/* LinkedIn Tab */}
        {activeTab === 'linkedin' && (
          <>
            <div className="panel">
              <h2 className="panel-title">LinkedIn Company Search</h2>
              <div className="grid" style={{ marginBottom: 16 }}>
                <input type="text" placeholder="Company name (e.g. google)" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input" />
              </div>
              <button onClick={searchCompany} disabled={loadingCompany} className="btn-primary">{loadingCompany ? 'Searching...' : 'Search Company'}</button>
            </div>

            {companyData && (
              <div className="panel">
                <h2 className="panel-title">Company Result</h2>
                {companyData.error ? (
                  <div className="card-block"><p className="muted">{companyData.error}</p></div>
                ) : companyView ? (
                  <div className="card-block">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{companyView.name}</div>
                        {companyView.about && <p className="muted" style={{ marginTop: 4 }}>{companyView.about}</p>}
                        {companyView.website && (
                          <p style={{ marginTop: 8 }}>
                            <a className="btn-link" href={companyView.website} target="_blank" rel="noreferrer">Website</a>
                          </p>
                        )}
                        {companyView.linkedin && (
                          <p style={{ marginTop: 8 }}>
                            <a className="btn-link" href={companyView.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
                          </p>
                        )}
                      </div>
                      <div>
                        <p><strong>Industry:</strong> {companyView.industry || '-'}</p>
                        <p><strong>Organization:</strong> {companyView.organizationType || '-'}</p>
                        <p><strong>Employees:</strong> {companyView.employees ?? '-'}</p>
                        <p><strong>Followers:</strong> {companyView.followers ?? '-'}</p>
                        {companyView.funding && (
                          <>
                            {typeof companyView.funding === 'object' ? (
                              <>
                                <p>
                                  <strong>Funding:</strong> {companyView.funding.lastRoundFunding ?? '-'}
                                  {companyView.funding.lastRoundDate ? ` (Last: ${companyView.funding.lastRoundDate})` : ''}
                                </p>
                                {Array.isArray(companyView.funding.rounds) && companyView.funding.rounds.length > 0 && (
                                  <div style={{ marginTop: 8 }}>
                                    <p><strong>Funding Rounds:</strong></p>
                                    <ul className="muted" style={{ fontSize: 12, paddingLeft: 18 }}>
                                      {companyView.funding.rounds.slice(0, 5).map((r, i) => (
                                        <li key={i}>
                                          {[r?.date || r?.roundDate, r?.amount || r?.funding, r?.series || r?.type]
                                            .filter(Boolean)
                                            .join(' • ')}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p><strong>Funding:</strong> {companyView.funding}</p>
                            )}
                          </>
                        )}
                        <p><strong>Headquarters:</strong> {companyView.headquarters || '-'}</p>
                      </div>
                    </div>
                    {Array.isArray(companyView.specialties) && companyView.specialties.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <p><strong>Specialties:</strong></p>
                        <div className="muted" style={{ fontSize: 12 }}>{companyView.specialties.join(', ')}</div>
                      </div>
                    )}
                    {Array.isArray(companyView.locations) && companyView.locations.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <p><strong>Locations (top 5):</strong></p>
                        <ul className="muted" style={{ fontSize: 12, paddingLeft: 18 }}>
                          {companyView.locations.map((loc, i) => (
                            <li key={i}>{typeof loc === 'string' ? loc : (loc?.name || loc?.address || JSON.stringify(loc))}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card-block">
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
{JSON.stringify(companyData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
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
