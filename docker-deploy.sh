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
  echo "  -h, --help        显示帮助信息"
  echo ""
}

# 默认参数
ENV="dev"
BUILD=false
CLEAN=false

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
      shift
      ;;
    -c|--clean)
      CLEAN=true
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

# 构建和启动
if [ "$BUILD" = true ]; then
  echo -e "${YELLOW}构建和启动容器...${NC}"
  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache && \
  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
else
  echo -e "${YELLOW}启动容器...${NC}"
  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
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
echo -e "\n${GREEN}应用部署完成!${NC}"
echo -e "访问应用: ${YELLOW}http://localhost:${PORT}${NC}"
echo -e "查看日志: ${YELLOW}docker logs -f ssg-web${NC}" 