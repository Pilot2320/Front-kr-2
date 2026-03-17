import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1>Регистрация</h1>
        {error && <p style={styles.error}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Имя"
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          required
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Фамилия"
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Зарегистрироваться</button>
        <p>Уже есть аккаунт? <Link to="/login">Вход</Link></p>
      </form>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', padding: 40 },
  form: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 },
  input: { padding: 10, fontSize: 16 },
  button: { padding: 12, background: '#333', color: 'white', border: 'none', cursor: 'pointer' },
  error: { color: 'red', margin: 0 },
};
