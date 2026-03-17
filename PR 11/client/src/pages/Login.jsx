import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1>Вход</h1>
        {error && <p style={styles.error}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Войти</button>
        <p>Нет аккаунта? <Link to="/register">Регистрация</Link></p>
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
