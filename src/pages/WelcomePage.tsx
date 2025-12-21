import { Trophy, Users, TrendingUp, Calendar, Award, Zap } from 'lucide-react';

type WelcomePageProps = {
  onGetStarted: () => void;
};

export default function WelcomePage({ onGetStarted }: WelcomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-16 pt-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-600 rounded-2xl mb-6 shadow-lg">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            Padel <span className="text-emerald-600">Ranking</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            O sistema definitivo para gerenciar suas partidas de padel e acompanhar seu progresso no ranking
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center px-12 py-5 bg-emerald-600 text-white text-xl font-bold rounded-2xl hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Trophy className="w-6 h-6 mr-3" />
            Começar Agora
          </button>
        </header>

        <div className="max-w-6xl mx-auto mb-16">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sistema de Matchmaking</h3>
              <p className="text-gray-600">
                Entre na fila sozinho ou em dupla e encontre adversários do seu nível automaticamente
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Ranking Dinâmico</h3>
              <p className="text-gray-600">
                Sistema de pontuação baseado no Premier Padel, com rankings separados por gênero
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gerenciamento Inteligente</h3>
              <p className="text-gray-600">
                Sistema de aprovação de partidas e gerenciamento de disponibilidade
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-12 text-white shadow-2xl mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">Como Funciona</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <h4 className="font-semibold mb-2">Crie sua Conta</h4>
                <p className="text-sm text-emerald-50">
                  Cadastre-se com suas informações e preferências de jogo
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <h4 className="font-semibold mb-2">Entre na Fila</h4>
                <p className="text-sm text-emerald-50">
                  Entre sozinho ou com um parceiro e aguarde o matchmaking
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <h4 className="font-semibold mb-2">Jogue e Registre</h4>
                <p className="text-sm text-emerald-50">
                  Aprove a partida, jogue e registre o resultado
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">4</span>
                </div>
                <h4 className="font-semibold mb-2">Suba no Ranking</h4>
                <p className="text-sm text-emerald-50">
                  Ganhe pontos e escale as posições do ranking
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-emerald-100">
              <Award className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Sistema de Pontuação Justo</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Pontos baseados na diferença de ranking dos adversários</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Vitórias contra adversários melhores rendem mais pontos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Duplas formadas previamente têm penalidade de 20%</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Rankings separados por gênero para competição justa</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-teal-100">
              <Zap className="w-12 h-12 text-teal-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Recursos Premium</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Matchmaking inteligente por nível e disponibilidade</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Sistema de aprovação de partidas em até 24 horas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Histórico completo de todas suas partidas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Estatísticas detalhadas e taxa de vitórias</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center px-12 py-5 bg-emerald-600 text-white text-xl font-bold rounded-2xl hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Trophy className="w-6 h-6 mr-3" />
            Começar Agora
          </button>
          <p className="mt-4 text-gray-600">
            Junte-se à comunidade de jogadores de padel
          </p>
        </div>
      </div>
    </div>
  );
}
