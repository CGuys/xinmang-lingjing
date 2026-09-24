import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layout/MainLayout.vue';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import StrategyView from '../views/StrategyView.vue';
import AiOrchestrationView from '../views/AiOrchestrationView.vue';
import CardsView from '../views/CardsView.vue';
import SensitiveWordsView from '../views/SensitiveWordsView.vue';
import UsersView from '../views/UsersView.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView
      },
      {
        path: 'strategy',
        name: 'Strategy',
        component: StrategyView
      },
      {
        path: 'ai-orchestration',
        name: 'AiOrchestration',
        component: AiOrchestrationView
      },
      {
        path: 'cards',
        name: 'Cards',
        component: CardsView
      },
      {
        path: 'sensitive-words',
        name: 'SensitiveWords',
        component: SensitiveWordsView
      },
      {
        path: 'users',
        name: 'Users',
        component: UsersView
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('xinmang_admin_token');
  if (!to.meta.public && !token) {
    next('/login');
  } else if (to.path === '/login' && token) {
    next('/dashboard');
  } else {
    next();
  }
});
