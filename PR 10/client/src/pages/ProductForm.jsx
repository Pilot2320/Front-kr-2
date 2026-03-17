import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productsApi } from '../api';
import { useAuth } from '../AuthContext';

export default function ProductForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', category: '', description: '', price: '' });
  const [error, setError] = useState('');
  const { user, logout } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    productsApi.create({ ...form, price: Number(form.price) })
      .then((res) => navigate(`/products/${res.data.id}`))
      .catch((err) => setError(err.response?.data?.error || 'Ошибка создания'));
  };

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/products">← К списку</Link>
        <span>{user?.email}</span>
        <button onClick={logout}>Выйти</button>
      </nav>
      <h1>Создать курс</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Название"
          required
          style={styles.input}
        />
        <input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="Категория"
          required
          style={styles.input}
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Описание"
          rows={3}
          style={styles.input}
        />
        <input
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="Цена"
          required
          style={styles.input}
        />
        <button type="submit">Создать</button>
      </form>
    </div>
  );
}

const styles = {
  page: { maxWidth: 600, margin: '0 auto', padding: 20 },
  nav: { display: 'flex', gap: 16, justifyContent: 'space-between', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: 10, fontSize: 16 },
};
