import { Trophy, Users, TrendingUp, Calendar, Award, Zap, MapPin, Shield } from 'lucide-react';

type WelcomePageProps = {
  onGetStarted: () => void;
};

export default function WelcomePage({ onGetStarted }: WelcomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-16 pt-8">
          <div className="inline-flex items-center justify-center mb-6">
            <img
              src="/image copy.png"
              alt="CLIMB"
              className="h-24 w-auto"
            />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Plataforma completa de matchmaking e ranking para padel com sistema inteligente de pareamento e competições regionais
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Matchmaking Inteligente</h3>
              <p className="text-sm text-gray-600">
                Sistema automático que pareia jogadores por nível, disponibilidade e preferências
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-3">
                <MapPin className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Rankings Regionais</h3>
              <p className="text-sm text-gray-600">
                Competições por cidade com ranking regional e global separados por gênero
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-3">
                <Trophy className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Ligas por Categoria</h3>
              <p className="text-sm text-gray-600">
                Sistema de ligas (1ª a 4ª categoria) com competições organizadas
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sistema Provisório</h3>
              <p className="text-sm text-gray-600">
                Primeiros 5 jogos com ajuste acelerado de pontuação para encontrar seu nível real
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">Como Funciona</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <h4 className="font-semibold mb-2">Complete seu Perfil</h4>
                <p className="text-sm text-emerald-50">
                  Cadastre-se e configure suas preferências de jogo, lado favorito e disponibilidade de horários
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <h4 className="font-semibold mb-2">Entre na Fila</h4>
                <p className="text-sm text-emerald-50">
                  Entre sozinho, convide um parceiro ou aceite convites para formar dupla
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <h4 className="font-semibold mb-2">Aprove e Jogue</h4>
                <p className="text-sm text-emerald-50">
                  Aceite a partida encontrada, jogue e ambos os jogadores registram o resultado
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">4</span>
                </div>
                <h4 className="font-semibold mb-2">Evolua no Sistema</h4>
                <p className="text-sm text-emerald-50">
                  Complete 5 jogos provisórios, ganhe pontos e participe de ligas competitivas
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
                  <span>Pontos baseados no sistema Premier Padel oficial</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Vitórias contra jogadores melhores rendem mais pontos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Primeiros 5 jogos com multiplicador 3x para calibragem rápida</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Duplas pré-formadas têm redução de 20% nos pontos ganhos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Rankings separados por gênero e região</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-teal-100">
              <Zap className="w-12 h-12 text-teal-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Funcionalidades Avançadas</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Sistema de convites para formar duplas com amigos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Aprovação bilateral de partidas para segurança</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Gerenciamento de disponibilidade por dia e período</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Categorias automáticas baseadas em pontuação (1ª a 4ª)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Histórico completo com estatísticas e taxa de vitórias</span>
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
