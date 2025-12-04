import React, { useState } from 'react';
import { Car, LogIn } from 'lucide-react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin({ name: name.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
            <div className="inline-block bg-blue-100 p-4 rounded-full">
               <Car className="text-blue-600 w-10 h-10" />
            </div>
          <h1 className="text-3xl font-bold text-gray-800 mt-4">Coleta Veicular</h1>
          <p className="text-gray-500 mt-1">Identifique-se para continuar</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 border border-gray-200">
          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Funcionário
              </label>
              <input
                id="employeeName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite seu nome"
                className="block w-full rounded-md border-gray-300 py-3 px-4 focus:ring-blue-500 focus:border-blue-500 sm:text-sm border shadow-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold rounded-lg py-3 px-4 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <LogIn size={18} />
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
