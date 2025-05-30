import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TextInput, 
  PasswordInput, 
  Paper, 
  Title, 
  Container, 
  Button, 
  Text, 
  Anchor,
  Group,
  Divider, // Import Divider
  Box // Import Box for spacing if needed
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '../contexts/AuthContext';
import authService from '../api/authService'; // Import authService

function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (value) => !value ? 'Username is required' : null,
      password: (value) => !value ? 'Password is required' : value.length < 3 ? 'Password must be at least 3 characters' : null,
    },
  });

  const handleSubmit = async (values) => {
    setIsLoading(true);
    
    try {
      const result = await login(values.username, values.password);
      
      if (result.success) {
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    authService.redirectToGoogleOAuth();
  };

  return (
    <Container size="xs" py="xl">
      <Title align="center" mb="lg">
        Welcome Back
      </Title>

      <Paper withBorder shadow="md" p={30} radius="md" mt="xl">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Username"
            placeholder="Your username"
            required
            {...form.getInputProps('username')}
            mb="md"
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            {...form.getInputProps('password')}
            mb="xl"
          />

          <Button fullWidth type="submit" loading={isLoading}>
            Sign in
          </Button>

          <Divider label="Or continue with" labelPosition="center" my="lg" />

          <Button fullWidth variant="outline" onClick={handleGoogleLogin} mb="xl">
            Sign in with Google
          </Button>
          
          <Text align="center" mt="md">
            Don't have an account?{' '}
            <Anchor component={Link} to="/register">
              Register
            </Anchor>
          </Text>
        </form>
      </Paper>
    </Container>
  );
}

export default Login;