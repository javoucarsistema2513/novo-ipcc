import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Church, 
  UserPlus, 
  FileText, 
  LogOut, 
  Phone, 
  MapPin, 
  User, 
  Download,
  Search,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Baby,
  Trash2,
  Pencil,
  X,
  ChevronRight,
  Sparkles,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { visitorService } from './services/visitorService';
import { Visitor } from './types';
import { User as SupabaseUser } from '@supabase/supabase-js';

const PDFReportGenerator = (visitors: Visitor[], category: string, period: string) => {
  const doc = new jsPDF();
  
  const categoryLabel = category === 'homens' ? 'Homens' : category === 'mulheres' ? 'Mulheres' : 'Jovens';
  const periodLabel = period === 'all' ? 'Todos' : period === 'weekly' ? 'Últimos 7 dias' : 'Últimos 30 dias';

  doc.setFontSize(20);
  doc.text(`Relatório: ${categoryLabel}`, 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Período: ${periodLabel} | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
  
  const tableData = visitors.map((v, i) => {
    let dateStr = '-';
    try {
      if (v.createdAt) {
        if (typeof v.createdAt === 'object' && v.createdAt.seconds) {
          dateStr = new Date(v.createdAt.seconds * 1000).toLocaleDateString('pt-BR');
        } else {
          dateStr = new Date(v.createdAt).toLocaleDateString('pt-BR');
        }
      }
    } catch (e) {
      console.error('Error parsing date:', e);
    }

    return [
      i + 1,
      v.name,
      v.phone,
      v.category ? v.category.charAt(0).toUpperCase() + v.category.slice(1) : '-',
      v.age || '-',
      v.gender || '-',
      v.birthDate ? new Date(v.birthDate).toLocaleDateString('pt-BR') : '-',
      v.participatesInCell === 'sim' ? `Sim ${v.cellLeader ? '(' + v.cellLeader + ')' : ''}` : v.participatesInCell === 'nao' ? 'Não' : '-',
      v.isMarriedOrLivesTogether === 'sim' ? 'Sim' : v.isMarriedOrLivesTogether === 'nao' ? 'Não' : '-',
      v.prayerRequest || '-',
      v.address,
      dateStr
    ];
  });
  
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Nome', 'Telefone', 'Grupo', 'Idade', 'Sexo', 'Nasc.', 'Célula', 'Mora Junto', 'Algum pedido de Oração?', 'Endereço', 'Data']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138] },
    styles: { fontSize: 8 }
  });
  
  doc.save(`relatorio-${category}-${period}.pdf`);
};

const CSVReportGenerator = (visitors: Visitor[], category: string, period: string) => {
  const headers = ['Nome', 'Telefone', 'Grupo', 'Idade', 'Sexo', 'Data de Nascimento', 'Participa de Célula', 'Mora Junto/Casado', 'Algum pedido de Oração?', 'Endereço', 'Data de Cadastro'];
  const rows = visitors.map(v => {
    let dateStr = '';
    try {
      if (v.createdAt) {
        if (typeof v.createdAt === 'object' && v.createdAt.seconds) {
          dateStr = new Date(v.createdAt.seconds * 1000).toLocaleDateString('pt-BR');
        } else {
          dateStr = new Date(v.createdAt).toLocaleDateString('pt-BR');
        }
      }
    } catch (e) {
      console.error('Error parsing date:', e);
    }

    return [
      v.name,
      v.phone,
      v.category || '',
      v.age || '',
      v.gender || '',
      v.birthDate || '',
      v.participatesInCell === 'sim' ? `Sim ${v.cellLeader ? '(' + v.cellLeader + ')' : ''}` : v.participatesInCell || '',
      v.isMarriedOrLivesTogether || '',
      v.prayerRequest ? v.prayerRequest.replace(/,/g, ';').replace(/\n/g, ' ') : '',
      v.address.replace(/,/g, ';'),
      dateStr
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio-${category}-${period}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'register' | 'list'>('home');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Report filter states
  const [reportPeriod, setReportPeriod] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [reportCategory, setReportCategory] = useState<'homens' | 'mulheres' | 'jovens'>('homens');

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Visitor form states
  const [showCategoryStep, setShowCategoryStep] = useState(true);
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    address: string;
    age: string;
    gender: string;
    birthDate: string;
    participatesInCell: string;
    cellLeader: string;
    category?: 'homens' | 'mulheres' | 'jovens';
    isMarriedOrLivesTogether: string;
    prayerRequest: string;
  }>({
    name: '',
    phone: '',
    address: '',
    age: '',
    gender: '',
    birthDate: '',
    participatesInCell: '',
    cellLeader: '',
    category: undefined,
    isMarriedOrLivesTogether: '',
    prayerRequest: ''
  });

  useEffect(() => {
    // Check active sessions and sets up the observer
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        visitorService.testConnection();
        fetchVisitors();
        setView('home');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        visitorService.testConnection();
        fetchVisitors();
        setView('home');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchVisitors = async () => {
    try {
      const data = await visitorService.getVisitors();
      if (data) setVisitors(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            }
          }
        });
        if (error) throw error;
        setAuthError('Verifique seu e-mail para confirmar o cadastro!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  const handleDeleteVisitor = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este visitante?')) return;
    
    try {
      await visitorService.deleteVisitor(id);
      setMessage({ type: 'success', text: 'Visitante removido com sucesso!' });
      fetchVisitors();
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao remover visitante.' });
    }
  };

  const handleEditVisitor = (visitor: Visitor) => {
    setEditingId(visitor.id || null);
    setFormData({
      name: visitor.name,
      phone: visitor.phone,
      address: visitor.address,
      age: visitor.age?.toString() || '',
      gender: visitor.gender || '',
      birthDate: visitor.birthDate || '',
      participatesInCell: visitor.participatesInCell || '',
      cellLeader: visitor.cellLeader || '',
      category: visitor.category,
      isMarriedOrLivesTogether: visitor.isMarriedOrLivesTogether || '',
      prayerRequest: visitor.prayerRequest || ''
    });
    setShowCategoryStep(false);
    setView('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setShowCategoryStep(true);
    setFormData({ name: '', phone: '', address: '', age: '', gender: '', birthDate: '', participatesInCell: '', cellLeader: '', category: undefined, isMarriedOrLivesTogether: '', prayerRequest: '' });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const visitorData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined
      };

      if (editingId) {
        await visitorService.updateVisitor(editingId, visitorData);
        setMessage({ type: 'success', text: 'Visitante atualizado com sucesso!' });
      } else {
        await visitorService.addVisitor(visitorData, user?.id);
        setMessage({ type: 'success', text: 'Visitante cadastrado com sucesso!' });
      }

      setFormData({ name: '', phone: '', address: '', age: '', gender: '', birthDate: '', participatesInCell: '', cellLeader: '', category: undefined, isMarriedOrLivesTogether: '', prayerRequest: '' });
      setEditingId(null);
      setShowCategoryStep(true);
      fetchVisitors();
      
      // Scroll to top to see success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Submit Error:', error);
      setMessage({ type: 'error', text: editingId ? 'Erro ao atualizar visitante.' : 'Erro ao cadastrar visitante.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReport = (type: 'pdf' | 'csv') => {
    let filtered = [...visitors];

    // Filter by category
    filtered = filtered.filter(v => v.category === reportCategory);

    // Filter by period
    if (reportPeriod !== 'all') {
      const now = new Date();
      const limitDate = new Date();
      if (reportPeriod === 'weekly') {
        limitDate.setDate(now.getDate() - 7);
      } else if (reportPeriod === 'monthly') {
        limitDate.setDate(now.getDate() - 30);
      }

      filtered = filtered.filter(v => {
        if (!v.createdAt) return false;
        const date = v.createdAt.seconds ? new Date(v.createdAt.seconds * 1000) : new Date(v.createdAt);
        return date >= limitDate;
      });
    }

    if (filtered.length === 0) {
      alert('Nenhum visitante encontrado para os filtros selecionados.');
      return;
    }

    if (type === 'pdf') {
      PDFReportGenerator(filtered, reportCategory, reportPeriod);
    } else {
      CSVReportGenerator(filtered, reportCategory, reportPeriod);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Image for Login Screen */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=2070" 
            alt="Pessoas unidas em círculo com mãos ao centro" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-blue-900/10" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-6 sm:p-8 max-w-[310px] sm:max-w-[380px] w-full mx-auto border border-white/50"
        >
          <div className="bg-blue-100 w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-5">
            <Church className="text-blue-600 w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 text-center mb-2 tracking-tighter">Consolidação</h1>
          <p className="text-blue-600 font-bold text-center mb-5 sm:mb-7 text-[10px] sm:text-[12px] uppercase tracking-[0.2em] px-3 py-1 bg-blue-50 rounded-lg w-fit mx-auto">Novo na Igreja</p>

          <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4">
            {authError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 italic">
                {authError}
              </div>
            )}

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    required
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    className="input-field pl-10 py-2.5 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">E-mail</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@igreja.com"
                  className="input-field pl-10 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Senha</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 py-2.5 text-sm"
                />
              </div>
            </div>

            <button 
              disabled={authLoading}
              className="w-full btn-primary h-10 sm:h-11"
            >
              {authLoading ? <Loader2 className="animate-spin w-4 h-4" /> : (authMode === 'login' ? 'Entrar' : 'Criar Conta')}
            </button>
          </form>


          <p className="mt-6 text-center text-[12px] sm:text-sm text-gray-500">
            {authMode === 'login' ? 'Não tem conta?' : 'Já possui conta?'}
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError(null);
              }}
              className="ml-1 text-blue-600 font-bold hover:underline"
            >
              {authMode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row h-screen h-[100dvh] overflow-hidden bg-white sm:bg-slate-50 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden sm:flex flex-col w-20 lg:w-64 bg-white border-r border-slate-200 shrink-0 z-30">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-50">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <Church className="w-6 h-6" />
          </div>
          <h1 className="font-black text-lg text-slate-800 hidden lg:block truncate">Sistema</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setView('home')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${view === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Início</span>
          </button>
          <button 
            onClick={() => {
              setView('register');
              setShowCategoryStep(true);
              handleCancelEdit();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${view === 'register' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <UserPlus className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Novo Visitante</span>
          </button>
          <button 
            onClick={() => setView('list')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <FileText className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Relatórios</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-50 shrink-0">
          <div className="bg-slate-50 p-3 rounded-2xl mb-3 hidden lg:block">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Usuário Logado</p>
            <p className="text-xs font-bold text-slate-700 truncate">{user.user_metadata?.display_name || user.email || 'Usuário'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Sair do App</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header - Mobile */}
        {view !== 'home' && (
          <header className="sm:hidden flex bg-white/90 backdrop-blur-lg border-b border-slate-100 h-14 shrink-0 z-20 px-4 items-center justify-between sticky top-0">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <Church className="w-5 h-5" />
              </div>
              <h1 className="font-black text-base text-slate-900 tracking-tight">IPCC.</h1>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </header>
        )}

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto px-0 py-0 relative h-full">
          <AnimatePresence mode="wait">
            {view === 'home' ? (
              <motion.div 
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative min-h-full w-full flex flex-col items-center justify-between text-center"
              >
                {/* Background Image - Full Screen App Look */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                   <img 
                    src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=2070" 
                    alt="Pessoas unidas em círculo com mãos ao centro" 
                    className="w-full h-full object-cover"
                  />
                  {/* Reduced overlay for maximum image impact */}
                  <div className="absolute inset-0 bg-blue-900/5" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-blue-900/30" />
                </div>

                {/* Top Actions (Minimalist) */}
                <div className="relative z-10 w-full p-6 flex justify-end">
                  <button 
                    onClick={handleLogout}
                    className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white/80 hover:bg-white/20 active:scale-95 transition-all border border-white/10"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>

                {/* Centered Content */}
                <div className="relative z-10 w-full max-w-sm px-6 pb-24 sm:pb-20">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="mb-12 w-fit mx-auto text-left"
                  >
                    <div className="bg-white/10 backdrop-blur-2xl p-5 rounded-[2rem] w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
                      <Church className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                    <h2 className="text-4xl sm:text-7xl font-black text-white mb-4 tracking-tighter uppercase leading-none drop-shadow-xl">
                      Consolidação
                    </h2>
                    <div className="w-fit px-4 py-2 bg-blue-500/20 backdrop-blur-md rounded-full border border-blue-400/30">
                      <p className="text-xs sm:text-sm font-black text-blue-100 tracking-[0.4em] uppercase">
                        Novo na Igreja
                      </p>
                    </div>
                  </motion.div>

                  <motion.button
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => {
                      setView('register');
                      setShowCategoryStep(true);
                      handleCancelEdit();
                    }}
                    className="w-full bg-white text-blue-950 h-16 rounded-[2rem] font-black text-xl uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                  >
                    Iniciar
                    <div className="bg-blue-950/10 p-2 rounded-full group-hover:translate-x-1 transition-transform">
                      <UserPlus className="w-6 h-6" />
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <div className="px-4 py-4 sm:px-10 sm:py-12 pb-20 sm:pb-12 max-w-4xl mx-auto w-full">
                {view === 'register' ? (
                  <motion.div 
                    key="register"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  <div className="mb-2 px-1 flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-1 tracking-tighter">
                        {editingId ? 'Editar Visitante' : 'Cadastrar Visitante'}
                      </h2>
                      <p className="text-slate-500 text-xs sm:text-sm font-medium tracking-tight">
                        {editingId ? 'Corrija as informações necessárias.' : 'Registre as informações para o banco de dados.'}
                      </p>
                    </div>
                    {editingId && (
                      <button 
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                      >
                        <X className="w-4 h-4" />
                        Cancelar Edição
                      </button>
                    )}
                  </div>

                  <div className="card-native p-4 sm:p-10 transform transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/5">
                    {showCategoryStep && !editingId ? (
                      <div className="space-y-8 py-4">
                        <div className="text-center">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-2">Selecione o Grupo</h3>
                          <p className="text-slate-500 text-sm font-medium">Para quem é este cadastro?</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 sm:gap-6 max-w-sm mx-auto">
                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, category: 'homens', gender: 'M' }));
                              setShowCategoryStep(false);
                            }}
                            className="bg-white border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/50 p-6 rounded-[2rem] flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-blue-100 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <User className="w-6 h-6" />
                              </div>
                              <span className="font-black text-lg text-slate-700 group-hover:text-blue-700">Homens</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                          </button>

                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, category: 'mulheres', gender: 'F' }));
                              setShowCategoryStep(false);
                            }}
                            className="bg-white border-2 border-slate-100 hover:border-pink-600 hover:bg-pink-50/50 p-6 rounded-[2rem] flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-pink-100 p-3 rounded-2xl group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                <User className="w-6 h-6" />
                              </div>
                              <span className="font-black text-lg text-slate-700 group-hover:text-pink-700">Mulheres</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                          </button>

                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, category: 'jovens' }));
                              setShowCategoryStep(false);
                            }}
                            className="bg-white border-2 border-slate-100 hover:border-violet-600 hover:bg-violet-50/50 p-6 rounded-[2rem] flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-violet-100 p-3 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                <Sparkles className="w-6 h-6" />
                              </div>
                              <span className="font-black text-lg text-slate-700 group-hover:text-violet-700">Jovens</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {message && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`mb-8 p-5 rounded-2xl flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
                          >
                            {message.type === 'success' && <CheckCircle2 className="w-6 h-6 shrink-0" />}
                            <span className="font-bold text-sm">{message.text}</span>
                            <button onClick={() => setMessage(null)} className="ml-auto p-1 bg-white/20 rounded-lg hover:bg-white/40">×</button>
                          </motion.div>
                        )}

                        <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-6">
                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Visitante</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                          <input 
                            required
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Nome completo do visitante"
                            className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Principal</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                            <input 
                              required
                              type="tel" 
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              placeholder="(00) 00000-0000"
                              className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Nasc.</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                            <input 
                              type="date" 
                              value={formData.birthDate}
                              onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                              className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                            />
                          </div>
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Idade</label>
                          <div className="relative">
                            <Baby className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                            <input 
                              type="number" 
                              value={formData.age}
                              onChange={(e) => setFormData({...formData, age: e.target.value})}
                              placeholder="00"
                              className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                            />
                          </div>
                        </div>
                        <div className="space-y-1 sm:space-y-2 col-span-2 sm:col-span-1">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexo</label>
                          <div className="flex gap-4 p-1">
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, gender: 'M'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.gender === 'M' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Masculino
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, gender: 'F'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.gender === 'F' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Feminino
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Participa de uma célula?</label>
                          <div className="flex gap-4 p-1">
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, participatesInCell: 'sim'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.participatesInCell === 'sim' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, participatesInCell: 'nao', cellLeader: ''})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.participatesInCell === 'nao' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Não
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {formData.participatesInCell === 'sim' && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0, marginTop: -20 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                              exit={{ opacity: 0, height: 0, marginTop: -20 }}
                              className="space-y-1 sm:space-y-2 overflow-hidden"
                            >
                              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Líder</label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                                <input 
                                  type="text" 
                                  value={formData.cellLeader}
                                  onChange={(e) => setFormData({...formData, cellLeader: e.target.value})}
                                  placeholder="Nome do líder da célula"
                                  className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Mora Junto ou é casado?</label>
                          <div className="flex gap-4 p-1">
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, isMarriedOrLivesTogether: 'sim'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.isMarriedOrLivesTogether === 'sim' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, isMarriedOrLivesTogether: 'nao'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.isMarriedOrLivesTogether === 'nao' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Não
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Algum pedido de Oração?</label>
                        <div className="relative">
                          <FileText className="absolute left-4 top-4 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                          <textarea 
                            rows={3}
                            value={formData.prayerRequest}
                            onChange={(e) => setFormData({...formData, prayerRequest: e.target.value})}
                            placeholder="Escreva aqui o pedido de oração se houver..."
                            className="input-field pl-10 sm:pl-12 pt-3 sm:pt-4 resize-none text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Efetiva</label>
                          <input 
                            disabled
                            type="text" 
                            className="input-field bg-slate-50 text-slate-500 font-bold h-12 sm:h-14 cursor-not-allowed text-sm sm:text-base"
                            value={new Date().toLocaleDateString('pt-BR')}
                          />
                        </div>
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-4 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                          <textarea 
                            required
                            rows={2}
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            placeholder="Rua, Número, Bairro e Cidade"
                            className="input-field pl-10 sm:pl-12 pt-3 sm:pt-4 resize-none text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <button 
                        disabled={isSubmitting}
                        className="w-full btn-primary h-14 sm:h-16 group"
                      >
                        {isSubmitting ? (
                          <Loader2 className="animate-spin w-6 h-6" />
                        ) : (
                          <div className="flex items-center gap-2">
                            {editingId ? <CheckCircle2 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                            <span>{editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
                </motion.div>
              ) : (
                <motion.div 
                    key="list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-8"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                      <div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-1 tracking-tighter">Relatórios & Gestão</h2>
                        <p className="text-slate-500 text-sm font-medium tracking-tight">Total de {visitors.length} registros.</p>
                      </div>
                    </div>

                    {/* Advanced Report Config Card */}
                    <div className="card-native p-6 sm:p-8 bg-white border-2 border-blue-100 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                        <FileText className="w-32 h-32 text-blue-900" />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                          <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200">
                            <FileText className="w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configurar Exportação</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          {/* Period Filter */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Período de Cadastro</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: 'all', label: 'Tudo' },
                                { id: 'weekly', label: 'Semanal' },
                                { id: 'monthly', label: 'Mensal' }
                              ].map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => setReportPeriod(p.id as any)}
                                  className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${reportPeriod === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'}`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Category Filter */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                              <Users className="w-3.5 h-3.5" />
                              <span>Filtrar por Grupo</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: 'homens', label: 'Homens' },
                                { id: 'mulheres', label: 'Mulheres' },
                                { id: 'jovens', label: 'Jovens' }
                              ].map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => setReportCategory(c.id as any)}
                                  className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${reportCategory === c.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'}`}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100 flex flex-wrap gap-4">
                          <button 
                            disabled={visitors.length === 0}
                            onClick={() => handleGenerateReport('pdf')}
                            className="flex-1 sm:flex-none bg-blue-600 text-white hover:bg-blue-700 px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-40"
                          >
                            <Download className="w-5 h-5" />
                            Gerar PDF
                          </button>
                          <button 
                            disabled={visitors.length === 0}
                            onClick={() => handleGenerateReport('csv')}
                            className="flex-1 sm:flex-none bg-emerald-600 text-white hover:bg-emerald-700 px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-40"
                          >
                            <FileText className="w-5 h-5" />
                            Exportar CSV
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visitors.length === 0 ? (
                      <div className="md:col-span-2 py-20 text-center flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                        <div className="bg-slate-50 p-6 rounded-full mb-4">
                          <Search className="w-12 h-12 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Vazio por aqui</h3>
                        <p className="text-slate-400 mt-1 max-w-[240px]">Os cadastros realizados aparecerão listados aqui.</p>
                      </div>
                    ) : (
                      visitors.map((v, i) => (
                        <motion.div 
                          key={v.id} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="bg-blue-50 p-2 sm:p-3 rounded-2xl text-blue-600">
                              <User className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="flex items-center gap-2">
                              {v.category && (
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                                  v.category === 'homens' ? 'bg-blue-100 text-blue-700' : 
                                  v.category === 'mulheres' ? 'bg-pink-100 text-pink-700' : 
                                  'bg-violet-100 text-violet-700'
                                }`}>
                                  {v.category === 'homens' ? 'Homem' : v.category === 'mulheres' ? 'Mulher' : 'Jovem'}
                                </span>
                              )}
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-50 px-3 py-1.5 rounded-full">
                                ID: {v.id?.slice(-4)}
                              </span>
                              <button 
                                onClick={() => handleEditVisitor(v)}
                                className="p-2 text-blue-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                title="Editar visitante"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => v.id && handleDeleteVisitor(v.id)}
                                className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                title="Remover visitante"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight mb-2 uppercase">{v.name}</h3>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-slate-600">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Phone className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-bold">{v.phone}</span>
                            </div>
                            
                            {(v.age || v.gender || v.birthDate) && (
                              <div className="flex flex-wrap gap-2">
                                {v.age && (
                                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <Baby className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-600">{v.age} anos</span>
                                  </div>
                                )}
                                {v.gender && (
                                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-600">{v.gender === 'M' ? 'Masc.' : 'Fem.'}</span>
                                  </div>
                                )}
                                {v.birthDate && (
                                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-600">Nasc. {new Date(v.birthDate).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {(v.participatesInCell || v.isMarriedOrLivesTogether) && (
                              <div className="flex flex-wrap gap-2">
                                {v.participatesInCell && (
                                  <div className={`flex flex-col gap-1 px-2 py-1.5 rounded-lg border ${v.participatesInCell === 'sim' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                    <span className="text-[10px] font-black uppercase tracking-tight">Célula: {v.participatesInCell === 'sim' ? 'Sim' : 'Não'}</span>
                                    {v.participatesInCell === 'sim' && v.cellLeader && (
                                      <span className="text-[9px] font-bold text-emerald-600 block leading-none">Líder: {v.cellLeader}</span>
                                    )}
                                  </div>
                                )}
                                {v.isMarriedOrLivesTogether && (
                                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-slate-600">
                                    <span className="text-[10px] font-bold uppercase tracking-tight">Família: {v.isMarriedOrLivesTogether === 'sim' ? 'Casado/Mora Junto' : 'Solteiro'}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {v.prayerRequest && (
                              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                                <div className="flex items-center gap-1 mb-1">
                                  <FileText className="w-3 h-3 text-amber-500" />
                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Algum pedido de Oração?</span>
                                </div>
                                <p className="text-xs text-amber-800 italic leading-relaxed line-clamp-3">{v.prayerRequest}</p>
                              </div>
                            )}

                            <div className="flex items-start gap-3 text-slate-400">
                              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-medium leading-relaxed line-clamp-2 sm:line-clamp-none">{v.address}</span>
                            </div>
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center bg-slate-50/50 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3 rounded-b-[28px] sm:rounded-b-[32px]">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registrado em</span>
                            <span className="text-xs font-black text-slate-900">
                              {v.createdAt ? new Date(v.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : '...'}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

        {/* Mobile Navbar */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-100 h-14 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          <button 
            onClick={() => setView('home')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${view === 'home' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <ShieldCheck className={`w-6 h-6 ${view === 'home' ? 'scale-110 drop-shadow-sm' : 'scale-100'}`} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
          </button>
          
          <button 
            onClick={() => setView('register')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${view === 'register' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <UserPlus className={`w-6 h-6 ${view === 'register' ? 'scale-110 drop-shadow-sm' : 'scale-100'}`} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Novo</span>
          </button>
          
          <button 
            onClick={() => setView('list')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${view === 'list' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <FileText className={`w-6 h-6 ${view === 'list' ? 'scale-110 drop-shadow-sm' : 'scale-100'}`} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Relatórios</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
