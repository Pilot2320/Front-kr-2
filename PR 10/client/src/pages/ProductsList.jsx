import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsApi } from '../api';
import { useAuth } from '../AuthContext';

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    productsApi.list()
      .then((res) => setProducts(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span>Курсы по саморазвитию | {user?.email}</span>
        <button onClick={logout}>Выйти</button>
      </nav>
      <div style={styles.header}>
        <h1>Список курсов</h1>
        <Link to="/products/new">+ Создать курс</Link>
      </div>
      <ul style={styles.list}>
        {products.map((p) => (
          <li key={p.id} style={styles.item}>
            <Link to={`/products/${p.id}`}>{p.title}</Link>
            <span>{p.price} ₽</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  page: { maxWidth: 800, margin: '0 auto', padding: 20 },
  nav: { display: 'flex', justifyContent: 'space-between', marginBottom: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  list: { listStyle: 'none', padding: 0 },
  item: { display: 'flex', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #eee' },
};
