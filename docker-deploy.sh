#!/bin/bash
# 销售助手应用Docker部署脚本

# 显示彩色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
  echo -e "${YELLOW}销售助手应用Docker部署脚本${NC}"
  echo ""
  echo "用法: $0 [选项]"
  echo ""
  echo "选项:"
  echo "  -e, --env ENV     指定环境 (dev, test, prod) [默认: dev]"
  echo "  -b, --build       重新构建镜像"
  echo "  -c, --clean       部署前清理"
  echo "  -s, --swap SIZE   创建临时SWAP文件，单位GB [默认: 不创建]"
  echo "  -h, --help        显示帮助信息"
  echo ""
}

# 默认参数
ENV="dev"
BUILD=false
CLEAN=false
CREATE_SWAP=false
SWAP_SIZE=0

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -e|--env)
      ENV="$2"
      shift
      shift
      ;;
    -b|--build)
      BUILD=true
      CREATE_SWAP=true  # 构建时自动开启SWAP
      SWAP_SIZE="4"     # 默认使用4GB SWAP
      shift
      ;;
    -c|--clean)
      CLEAN=true
      shift
      ;;
    -s|--swap)
      CREATE_SWAP=true
      SWAP_SIZE="$2"
      shift
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo -e "${RED}未知选项: $1${NC}"
      show_help
      exit 1
      ;;
  esac
done

# 创建SWAP文件以增加虚拟内存（适用于低内存服务器）
create_swap() {
  if [ "$CREATE_SWAP" = true ]; then
    if [ -f /swapfile ]; then
      echo -e "${YELLOW}SWAP文件已存在，跳过创建${NC}"
    else
      echo -e "${YELLOW}创建${SWAP_SIZE}GB SWAP文件以增加虚拟内存...${NC}"
      sudo fallocate -l ${SWAP_SIZE}G /swapfile
      sudo chmod 600 /swapfile
      sudo mkswap /swapfile
      sudo swapon /swapfile
      echo -e "${GREEN}SWAP文件已创建并激活${NC}"
      free -h
    fi
  fi
}

# 清理系统资源
clean_system() {
  echo -e "${YELLOW}清理系统资源以释放空间...${NC}"
  
  # 清理Docker缓存
  echo -e "${YELLOW}清理未使用的Docker资源...${NC}"
  docker system prune -f
  
  # 清理apt缓存
  echo -e "${YELLOW}清理apt缓存...${NC}"
  sudo apt-get clean || true
  
  # 清理日志文件
  echo -e "${YELLOW}清理日志文件...${NC}"
  sudo find /var/log -type f -name "*.log" -exec truncate -s 0 {} \; 2>/dev/null || true
  sudo find /var/log -type f -name "*.gz" -delete 2>/dev/null || true
  
  # 显示磁盘使用情况
  echo -e "${YELLOW}清理后的磁盘使用情况:${NC}"
  df -h
}

# 清理SWAP文件
cleanup_swap() {
  if [ "$CREATE_SWAP" = true ]; then
    if [ -f /swapfile ]; then
      echo -e "${YELLOW}清理临时SWAP文件...${NC}"
      sudo swapoff /swapfile
      sudo rm -f /swapfile
      echo -e "${GREEN}SWAP文件已清理${NC}"
    fi
  fi
}

# 设置环境特定变量
case $ENV in
  prod|production)
    ENV_FILE="docker.env.prod"
    COMPOSE_FILE="docker-compose.yml"
    echo -e "${YELLOW}使用生产环境配置${NC}"
    ;;
  test|staging)
    ENV_FILE="docker.env.test"
    COMPOSE_FILE="docker-compose.yml"
    echo -e "${YELLOW}使用测试环境配置${NC}"
    ;;
  dev|development)
    ENV_FILE="docker.env.dev"
    COMPOSE_FILE="docker-compose.yml"
    echo -e "${YELLOW}使用开发环境配置${NC}"
    ;;
  *)
    echo -e "${RED}未知环境: $ENV${NC}"
    exit 1
    ;;
esac

# 检查必要文件是否存在
if [ ! -f $COMPOSE_FILE ]; then
  echo -e "${RED}错误: $COMPOSE_FILE 不存在${NC}"
  exit 1
fi

# 检查环境变量文件是否存在，如果不存在则使用示例文件
if [ ! -f $ENV_FILE ]; then
  if [ -f docker.env.example ]; then
    echo -e "${YELLOW}警告: $ENV_FILE 不存在，使用 docker.env.example${NC}"
    cp docker.env.example $ENV_FILE
  else
    echo -e "${RED}错误: 找不到环境变量文件${NC}"
    exit 1
  fi
fi

# 创建必要的目录结构
mkdir -p public/uploads

# 清理
if [ "$CLEAN" = true ]; then
  echo -e "${YELLOW}清理旧的容器...${NC}"
  docker compose -f $COMPOSE_FILE down
fi

# 如果是构建模式，尝试创建SWAP和清理系统
if [ "$BUILD" = true ] && [ "$CREATE_SWAP" = true ]; then
  # 清理系统资源
  clean_system
  # 创建SWAP
  create_swap
fi

# 构建和启动
if [ "$BUILD" = true ]; then
  echo -e "${YELLOW}构建和启动容器...${NC}"
  echo -e "${YELLOW}当前内存状态:${NC}"
  free -h
  
  # 构建前使用更多优化参数
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1
  
  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache && \
  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
else
  echo -e "${YELLOW}启动容器...${NC}"
  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
fi

# 清理SWAP文件（如果是临时创建的）
if [ "$BUILD" = true ] && [ "$CREATE_SWAP" = true ]; then
  cleanup_swap
fi

# 检查启动状态
if [ $? -eq 0 ]; then
  echo -e "${GREEN}容器已成功启动!${NC}"
  echo -e "${YELLOW}查看容器状态:${NC}"
  docker compose -f $COMPOSE_FILE ps
else
  echo -e "${RED}启动容器时出现错误!${NC}"
  echo -e "${YELLOW}查看日志:${NC} docker compose -f $COMPOSE_FILE logs"
  exit 1
fi

# 显示应用访问信息
PORT=$(grep "PORT=" $ENV_FILE | cut -d= -f2 || echo "3109")
API_URL=$(grep "API_URL=" $ENV_FILE | cut -d= -f2 || echo "未设置")
NEXT_PUBLIC_API_URL=$(grep "NEXT_PUBLIC_API_URL=" $ENV_FILE | cut -d= -f2 || echo "未设置")

echo -e "\n${GREEN}应用部署完成!${NC}"
echo -e "访问应用: ${YELLOW}http://localhost:${PORT}${NC}"
echo -e "查看日志: ${YELLOW}docker logs -f ssg-web${NC}"

# 检查API地址是否正确设置
if [[ "$API_URL" == "未设置" || "$API_URL" == "http://localhost:8000" || "$API_URL" == "http://api-server-host:8000" ]]; then
  echo -e "\n${RED}警告: API地址可能未正确设置!${NC}"
  echo -e "当前API地址: ${YELLOW}${API_URL}${NC}"
  echo -e "请确保在 ${YELLOW}${ENV_FILE}${NC} 文件中设置了正确的API_URL和NEXT_PUBLIC_API_URL"
  echo -e "示例: ${GREEN}API_URL=http://真实的API服务器地址:端口${NC}"
  echo -e "      ${GREEN}NEXT_PUBLIC_API_URL=http://真实的API服务器地址:端口${NC}"
fi 