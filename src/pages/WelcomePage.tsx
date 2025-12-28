import { Trophy, Users, TrendingUp, Calendar, Award, Zap, MapPin, Shield } from 'lucide-react';

type WelcomePageProps = {
  onGetStarted: () => void;
};

export default function WelcomePage({ onGetStarted }: WelcomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 overflow-x-hidden">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <header className="text-center mb-10 md:mb-16 pt-4 md:pt-8">
          <div className="inline-flex items-center justify-center mb-4 md:mb-6">
            <img
              src="/image copy.png"
              alt="CLIMB"
              className="h-16 md:h-24 w-auto"
            />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800 max-w-2xl mx-auto mb-6 md:mb-8 tracking-tight px-2">
            Jogue. Evolua. Conquiste.
          </h2>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center px-8 md:px-12 py-4 md:py-5 bg-emerald-600 text-white text-lg md:text-xl font-bold rounded-2xl hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl active:scale-95"
          >
            <Trophy className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
            Comecar Agora
          </button>
        </header>

        <div className="max-w-6xl mx-auto mb-10 md:mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-10 md:mb-16">
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 rounded-lg md:rounded-xl flex items-center justify-center mb-2 md:mb-3">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1 md:mb-2">Matchmaking Inteligente</h3>
              <p className="text-xs md:text-sm text-gray-600 hidden md:block">
                Sistema automatico que pareia jogadores por nivel, disponibilidade e preferencias
              </p>
            </div>

            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-100 rounded-lg md:rounded-xl flex items-center justify-center mb-2 md:mb-3">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-teal-600" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1 md:mb-2">Rankings Regionais</h3>
              <p className="text-xs md:text-sm text-gray-600 hidden md:block">
                Competicoes por cidade com ranking regional e global separados por genero
              </p>
            </div>

            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-cyan-100 rounded-lg md:rounded-xl flex items-center justify-center mb-2 md:mb-3">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-cyan-600" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1 md:mb-2">Ligas por Categoria</h3>
              <p className="text-xs md:text-sm text-gray-600 hidden md:block">
                Sistema de ligas (1a a 4a categoria) com competicoes organizadas
              </p>
            </div>

            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg md:rounded-xl flex items-center justify-center mb-2 md:mb-3">
                <Shield className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1 md:mb-2">Sistema Provisorio</h3>
              <p className="text-xs md:text-sm text-gray-600 hidden md:block">
                Primeiros 5 jogos com ajuste acelerado de pontuacao para encontrar seu nivel real
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl md:rounded-3xl p-5 md:p-12 text-white shadow-2xl mb-10 md:mb-16">
            <h2 className="text-xl md:text-3xl font-bold mb-5 md:mb-8 text-center">Como Funciona</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                  <span className="text-xl md:text-2xl font-bold">1</span>
                </div>
                <h4 className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Complete seu Perfil</h4>
                <p className="text-xs md:text-sm text-emerald-50 hidden md:block">
                  Cadastre-se e configure suas preferencias de jogo, lado favorito e disponibilidade de horarios
                </p>
              </div>

              <div className="text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                  <span className="text-xl md:text-2xl font-bold">2</span>
                </div>
                <h4 className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Entre na Fila</h4>
                <p className="text-xs md:text-sm text-emerald-50 hidden md:block">
                  Entre sozinho, convide um parceiro ou aceite convites para formar dupla
                </p>
              </div>

              <div className="text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                  <span className="text-xl md:text-2xl font-bold">3</span>
                </div>
                <h4 className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Aprove e Jogue</h4>
                <p className="text-xs md:text-sm text-emerald-50 hidden md:block">
                  Aceite a partida encontrada, jogue e ambos os jogadores registram o resultado
                </p>
              </div>

              <div className="text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                  <span className="text-xl md:text-2xl font-bold">4</span>
                </div>
                <h4 className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Evolua no Sistema</h4>
                <p className="text-xs md:text-sm text-emerald-50 hidden md:block">
                  Complete 5 jogos provisorios, ganhe pontos e participe de ligas competitivas
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 mb-10 md:mb-16">
            <div className="bg-white rounded-xl md:rounded-2xl p-5 md:p-8 shadow-lg border-2 border-emerald-100">
              <Award className="w-10 h-10 md:w-12 md:h-12 text-emerald-600 mb-3 md:mb-4" />
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Sistema de Pontuacao Justo</h3>
              <ul className="space-y-2 md:space-y-3 text-gray-600 text-sm md:text-base">
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">-</span>
                  <span>Pontos baseados no sistema Premier Padel oficial</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">-</span>
                  <span>Vitorias contra jogadores melhores rendem mais pontos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">-</span>
                  <span>Primeiros 5 jogos com multiplicador 3x para calibragem rapida</span>
                </li>
                <li className="flex items-start hidden md:flex">
                  <span className="text-emerald-600 mr-2">-</span>
                  <span>Duplas pre-formadas tem reducao de 20% nos pontos ganhos</span>
                </li>
                <li className="flex items-start hidden md:flex">
                  <span className="text-emerald-600 mr-2">-</span>
                  <span>Rankings separados por genero e regiao</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl md:rounded-2xl p-5 md:p-8 shadow-lg border-2 border-teal-100">
              <Zap className="w-10 h-10 md:w-12 md:h-12 text-teal-600 mb-3 md:mb-4" />
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Funcionalidades Avancadas</h3>
              <ul className="space-y-2 md:space-y-3 text-gray-600 text-sm md:text-base">
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">-</span>
                  <span>Sistema de convites para formar duplas com amigos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">-</span>
                  <span>Aprovacao bilateral de partidas para seguranca</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">-</span>
                  <span>Gerenciamento de disponibilidade por dia e periodo</span>
                </li>
                <li className="flex items-start hidden md:flex">
                  <span className="text-teal-600 mr-2">-</span>
                  <span>Categorias automaticas baseadas em pontuacao (1a a 4a)</span>
                </li>
                <li className="flex items-start hidden md:flex">
                  <span className="text-teal-600 mr-2">-</span>
                  <span>Historico completo com estatisticas e taxa de vitorias</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center pb-8">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center px-8 md:px-12 py-4 md:py-5 bg-emerald-600 text-white text-lg md:text-xl font-bold rounded-2xl hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl active:scale-95"
          >
            <Trophy className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
            Comecar Agora
          </button>
          <p className="mt-4 text-gray-600 text-sm md:text-base">
            Junte-se a comunidade de jogadores de padel
          </p>
        </div>
      </div>
    </div>
  );
}
