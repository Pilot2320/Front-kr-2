import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productsApi } from '../api';
import { useAuth } from '../AuthContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const canEdit = user?.role === 'seller' || user?.role === 'admin';
  const canDelete = user?.role === 'admin';

  useEffect(() => {
    productsApi.get(id)
      .then((res) => {
        setProduct(res.data);
        setForm({ title: res.data.title, category: res.data.category, description: res.data.description, price: res.data.price });
      })
      .catch((err) => setError(err.response?.data?.error || 'Курс не найден'));
  }, [id]);

  const handleSave = (e) => {
    e.preventDefault();
    productsApi.update(id, form)
      .then((res) => { setProduct(res.data); setEditMode(false); })
      .catch((err) => setError(err.response?.data?.error || 'Ошибка сохранения'));
  };

  const handleDelete = () => {
    if (!confirm('Удалить курс?')) return;
    productsApi.delete(id)
      .then(() => navigate('/products'))
      .catch((err) => setError(err.response?.data?.error || 'Ошибка удаления'));
  };

  if (!product) return error ? <p style={{ color: 'red' }}>{error}</p> : <p>Загрузка...</p>;

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/products">← К списку</Link>
        <span>{user?.email}</span>
        <button onClick={logout}>Выйти</button>
      </nav>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {editMode ? (
        <form onSubmit={handleSave} style={styles.form}>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Название" style={styles.input} required />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Категория" style={styles.input} required />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Описание" style={styles.input} rows={3} />
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} placeholder="Цена" style={styles.input} required />
          <button type="submit">Сохранить</button>
          <button type="button" onClick={() => setEditMode(false)}>Отмена</button>
        </form>
      ) : (
        <>
          <h1>{product.title}</h1>
          <p><strong>Категория:</strong> {product.category}</p>
          <p><strong>Описание:</strong> {product.description}</p>
          <p><strong>Цена:</strong> {product.price} ₽</p>
          <div style={styles.actions}>
            {canEdit && <button onClick={() => setEditMode(true)}>Редактировать</button>}
            {canDelete && <button onClick={handleDelete} style={{ background: 'red' }}>Удалить</button>}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 600, margin: '0 auto', padding: 20 },
  nav: { display: 'flex', gap: 16, justifyContent: 'space-between', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: 10, fontSize: 16 },
  actions: { display: 'flex', gap: 12, marginTop: 20 },
};
