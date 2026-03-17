import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../api';
import { useAuth } from '../AuthContext';

export default function UsersAdmin() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = () =>
    usersApi.list()
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Ошибка загрузки пользователей'));

  useEffect(() => { load(); }, []);

  const updateUser = async (u, patch) => {
    setSavingId(u.id);
    setError('');
    try {
      const { data } = await usersApi.update(u.id, patch);
      setUsers((prev) => prev.map(x => x.id === u.id ? data : x));
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  const blockUser = async (u) => {
    if (!confirm(`Заблокировать пользователя ${u.email}?`)) return;
    setSavingId(u.id);
    setError('');
    try {
      const { data } = await usersApi.block(u.id);
      setUsers((prev) => prev.map(x => x.id === u.id ? data.user : x));
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка блокировки');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/products">← Товары</Link>
        <span>{user?.email} | role: {user?.role}</span>
        <button onClick={logout}>Выйти</button>
      </nav>
      <h1>Пользователи</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Имя</th>
            <th style={styles.th}>Фамилия</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Blocked</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={styles.td}>{u.email}</td>
              <td style={styles.td}>{u.first_name}</td>
              <td style={styles.td}>{u.last_name}</td>
              <td style={styles.td}>
                <select
                  value={u.role}
                  disabled={savingId === u.id}
                  onChange={(e) => updateUser(u, { role: e.target.value })}
                >
                  <option value="user">user</option>
                  <option value="seller">seller</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td style={styles.td}>{u.blocked ? 'yes' : 'no'}</td>
              <td style={styles.td}>
                <button
                  onClick={() => blockUser(u)}
                  disabled={savingId === u.id || u.blocked}
                  style={{ background: 'red' }}
                >
                  Block
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: { maxWidth: 900, margin: '0 auto', padding: 20 },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 },
  td: { borderBottom: '1px solid #eee', padding: 8, verticalAlign: 'middle' },
};

