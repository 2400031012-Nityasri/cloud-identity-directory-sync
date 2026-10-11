
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = 'http://127.0.0.1:5000/api'

const initialUsers = [
  {
    id: '101',
    name: 'Nitya Degala',
    email: 'nitya@example.com',
    group: 'Students',
    status: 'Active',
  },
  {
    id: '102',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    group: 'Students',
    status: 'Active',
  },
  {
    id: '103',
    name: 'Priya Reddy',
    email: 'priya@example.com',
    group: 'Faculty',
    status: 'Inactive',
  },
]

async function fetchDirectoryData() {
  const response = await fetch(`${API_URL}/users`)

  if (!response.ok) {
    throw new Error('Could not load directory data from Python.')
  }

  return response.json()
}

async function runDirectorySync() {
  const response = await fetch(`${API_URL}/sync`, {
    method: 'POST',
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Synchronization failed.')
  }

  return result
}

function formatSourceUsers(source = []) {
  return source.map((user) => ({
    id: String(user.user_id),
    name: `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    group: user.group,
    status:
      String(user.status).toLowerCase() === 'active'
        ? 'Active'
        : 'Inactive',
  }))
}

function formatTargetUsers(target = []) {
  return target.map((user) => ({
    id: String(user.user_id ?? user.id ?? ''),
    name:
      user.name ||
      `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    email: user.email || '',
    group: user.group || 'Unassigned',
    status:
      String(user.status).toLowerCase() === 'active'
        ? 'Active'
        : 'Inactive',
  }))
}

function formatBackendLogs(lines = []) {
  return lines.map((line, index) => {
    const text = typeof line === 'string' ? line : JSON.stringify(line)
    const separator = text.indexOf(' | ')

    return {
      time: separator >= 0 ? text.slice(0, separator) : `Log ${index + 1}`,
      message: separator >= 0 ? text.slice(separator + 3) : text,
      type: 'info',
    }
  })
}

function App() {
  const [users, setUsers] = useState(initialUsers)
  const [targetUsers, setTargetUsers] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [running, setRunning] = useState(false)
  const [backendStatus, setBackendStatus] = useState('Connecting')
  const [syncMessage, setSyncMessage] = useState('')
  const [logs, setLogs] = useState([
    {
      time: 'Ready',
      message: 'CloudSync dashboard initialized.',
      type: 'info',
    },
    {
      time: 'Ready',
      message: 'Waiting for Python backend connection.',
      type: 'info',
    },
  ])

  async function loadDirectory(showError = true) {
    try {
      const data = await fetchDirectoryData()

      if (data.error) {
        throw new Error(data.error)
      }

      setUsers(formatSourceUsers(data.source || []))
      setTargetUsers(formatTargetUsers(data.target || []))
      setLogs(formatBackendLogs(data.logs || []))
      setBackendStatus('Connected')

      return true
    } catch (error) {
      setBackendStatus('Offline')

      if (showError) {
        setSyncMessage(
          `${error.message}. Check that Flask is running on port 5000.`,
        )
      }

      return false
    }
  }

  useEffect(() => {
    loadDirectory()

    // Refresh the displayed data periodically while this page is open.
    const intervalId = window.setInterval(() => {
      loadDirectory(false)
    }, 10000)

    return () => window.clearInterval(intervalId)
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = search.toLowerCase()

      const matchesSearch =
        `${user.name} ${user.email} ${user.group} ${user.id}`
          .toLowerCase()
          .includes(query)

      const matchesFilter =
        filter === 'All' || user.status === filter

      return matchesSearch && matchesFilter
    })
  }, [users, search, filter])

  const activeCount = users.filter(
    (user) => user.status === 'Active',
  ).length

  const inactiveCount = users.length - activeCount

  async function runSync() {
    if (running) return

    setRunning(true)
    setSyncMessage('Running Python synchronization...')

    try {
      const result = await runDirectorySync()

      // Load the latest source, target and log data from Flask.
      await loadDirectory(false)

      setSyncMessage(
        'Synchronization completed. Local simulation files were processed.',
      )

      const output = String(result.output || '').trim()

      setLogs((previous) => [
        {
          time: new Date().toLocaleTimeString(),
          message: output || 'Python sync completed successfully.',
          type: 'success',
        },
        ...previous,
      ])
    } catch (error) {
      setSyncMessage(`Sync failed: ${error.message}`)

      setLogs((previous) => [
        {
          time: new Date().toLocaleTimeString(),
          message: error.message,
          type: 'error',
        },
        ...previous,
      ])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">C</div>
          <div>
            <strong>CloudSync</strong>
            <span>IDENTITY PLATFORM</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav>
          <a className="nav-item selected" href="#overview">
            <span>▦</span> Overview
          </a>
          <a className="nav-item" href="#users">
            <span>♙</span> Directory Users
          </a>
          <a className="nav-item" href="#connections">
            <span>⇄</span> Connections
          </a>
          <a className="nav-item" href="#logs">
            <span>≡</span> Audit Logs
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-dot" />
          <div>
            <strong>Demo environment</strong>
            <span>Local simulation</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace /</span> Overview
          </div>

          <div className="profile">
            <div className="avatar">N</div>
            <span>Administrator</span>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">
              IDENTITY &amp; ACCESS MANAGEMENT
            </div>
            <h1>Directory Overview</h1>
            <p>
              Monitor directory records and demonstrate synchronization.
            </p>
          </div>

          <div className="environment">
            <span />
            SIMULATION MODE
          </div>
        </section>

        <div className="notice">
          <span className="notice-icon">i</span>
          <div>
            <strong>Simulation environment</strong>
            <p>
              Data is loaded from your local Python backend. This dashboard
              is not connected to a live Google Workspace directory.
            </p>
          </div>
        </div>

        <section className="metrics">
          <article className="metric-card">
            <div className="metric-top">
              <span>Total source users</span>
              <span className="metric-icon blue">♙</span>
            </div>
            <strong>{String(users.length).padStart(2, '0')}</strong>
            <small>Loaded from Python</small>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              <span>Active users</span>
              <span className="metric-icon green">✓</span>
            </div>
            <strong>{String(activeCount).padStart(2, '0')}</strong>
            <small>Active in source directory</small>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              <span>Inactive users</span>
              <span className="metric-icon amber">Ⅱ</span>
            </div>
            <strong>{String(inactiveCount).padStart(2, '0')}</strong>
            <small>Inactive in source directory</small>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              <span>Python backend</span>
              <span className="metric-icon purple">⇄</span>
            </div>
            <strong
              className="ready-text"
              style={{
                fontSize: backendStatus === 'Connected' ? undefined : '20px',
              }}
            >
              {backendStatus}
            </strong>
            <small>Flask API · Port 5000</small>
          </article>
        </section>

        <section className="connection-panel" id="connections">
          <div className="section-heading">
            <div>
              <h2>Directory connections</h2>
              <p>Source and target overview</p>
            </div>
            <span className="tag">DEMO</span>
          </div>

          <div className="connection-flow">
            <div className="endpoint">
              <div className="endpoint-icon source-icon">CSV</div>
              <div>
                <strong>Source Directory</strong>
                <span>source_users.csv</span>
              </div>
              <span className="status-pill online">● Local source</span>
            </div>

            <div className="flow-arrow">
              <span>→</span>
              <small>PYTHON SYNC</small>
            </div>

            <div className="endpoint">
              <div className="endpoint-icon target-icon">JSON</div>
              <div>
                <strong>Target Directory</strong>
                <span>google_directory_simulated.json</span>
              </div>
              <span className="status-pill simulated">
                ● {targetUsers.length} records
              </span>
            </div>
          </div>
        </section>

        <section className="users-panel" id="users">
          <div className="section-heading">
            <div>
              <h2>Directory users</h2>
              <p>Browse records loaded from your Python backend</p>
            </div>

            <button
              className="primary-button"
              onClick={runSync}
              disabled={running || backendStatus !== 'Connected'}
            >
              {running ? '◌ Running sync...' : '⇄ Run Sync Demo'}
            </button>
          </div>

          {syncMessage && (
            <p
              role="status"
              style={{
                color: syncMessage.startsWith('Sync failed')
                  ? '#fca5a5'
                  : '#a5b4fc',
                margin: '12px 0',
              }}
            >
              {syncMessage}
            </p>
          )}

          <div className="table-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email or group..."
                aria-label="Search directory users"
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter users"
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>USER</th>
                  <th>GROUP</th>
                  <th>STATUS</th>
                  <th>USER ID</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)}
                        </div>

                        <div>
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>{user.group}</td>

                    <td>
                      <span
                        className={`user-status ${user.status.toLowerCase()}`}
                      >
                        <span />
                        {user.status}
                      </span>
                    </td>

                    <td className="id-cell">USR-{user.id}</td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      No matching users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            Showing {filteredUsers.length} of {users.length} source records
            <span>Python backend · Simulation</span>
          </div>
        </section>

        <section className="users-panel">
          <div className="section-heading">
            <div>
              <h2>Target directory</h2>
              <p>Records currently stored in the simulated JSON target</p>
            </div>
            <span className="tag">JSON</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>USER</th>
                  <th>GROUP</th>
                  <th>STATUS</th>
                  <th>USER ID</th>
                </tr>
              </thead>

              <tbody>
                {targetUsers.map((user, index) => (
                  <tr key={`${user.id}-${index}`}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{user.group}</td>
                    <td>
                      <span
                        className={`user-status ${user.status.toLowerCase()}`}
                      >
                        <span />
                        {user.status}
                      </span>
                    </td>
                    <td className="id-cell">USR-{user.id}</td>
                  </tr>
                ))}

                {targetUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      No target records returned by the backend yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="logs-panel" id="logs">
          <div className="section-heading">
            <div>
              <h2>Activity logs</h2>
              <p>Recent events from the Python backend</p>
            </div>
            <span className="live-label">
              <span />
              {backendStatus === 'Connected' ? 'BACKEND CONNECTED' : 'BACKEND OFFLINE'}
            </span>
          </div>

          <div className="logs-list">
            {logs.map((log, index) => (
              <div
                className="log-row"
                key={`${log.time}-${index}`}
              >
                <span className={`log-mark ${log.type}`}>
                  {log.type === 'error'
                    ? '!'
                    : log.type === 'success'
                      ? '✓'
                      : 'i'}
                </span>
                <span className="log-time">{log.time}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="empty-state">No activity logs available.</div>
            )}
          </div>
        </section>

        <footer>
          CloudSync
          <span>
            Student project · Python + React · Local simulation only
          </span>
        </footer>
      </main>
    </div>
  )
}

export default App
