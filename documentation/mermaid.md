graph TB
  subgraph "1. Current Setup: Direct SSH to EC2"
      A1[GitHub Repository] -->|Push to main| B1[GitHub Actions]
      B1 -->|SSH Connection| C1[EC2 Instance]
      C1 -->|PM2 Process Manager| D1[Node.js App<br/>Port 3000/3001]
      D1 -->|Direct Connection| E1[RDS PostgreSQL<br/>alpb-1-instance-1]
      
      style A1 fill:#f9f,stroke:#333,stroke-width:2px
      style C1 fill:#ff9,stroke:#333,stroke-width:2px
      style E1 fill:#9ff,stroke:#333,stroke-width:2px
      
      F1[Manual Management Required:<br/>- Server updates<br/>- Security patches<br/>- Scaling<br/>- Monitoring]
      C1 -.-> F1
  end

  subgraph "2. Multi-Container ECS/Docker Setup"
      A2[GitHub Repository] -->|Push to main| B2[GitHub Actions]
      B2 -->|Build & Push| C2[ECR Registry]
      C2 -->|Deploy| D2[ECS Cluster]
      D2 -->|Task Definition| E2[Fargate Tasks]
      E2 -->|Container 1| F2[Frontend Container<br/>Next.js]
      E2 -->|Container 2| G2[Backend Container<br/>Express API]
      H2[Application Load Balancer] -->|Route /api/*| G2
      H2 -->|Route /*| F2
      G2 -->|Managed Connection| I2[RDS PostgreSQL<br/>alpb-1-instance-1]
      
      style A2 fill:#f9f,stroke:#333,stroke-width:2px
      style D2 fill:#9f9,stroke:#333,stroke-width:2px
      style I2 fill:#9ff,stroke:#333,stroke-width:2px
      
      J2[AWS Managed:<br/>- Auto-scaling<br/>- Health checks<br/>- Rolling updates<br/>- Container orchestration]
      D2 -.-> J2
  end

  subgraph "3. Single Container Elastic Beanstalk"
      A3[GitHub Repository] -->|Push to main| B3[GitHub Actions]
      B3 -->|EB Deploy| C3[Elastic Beanstalk]
      C3 -->|Manages| D3[EC2 Instances<br/>Auto Scaling Group]
      D3 -->|Runs| E3[Single Container<br/>Node.js App]
      F3[Elastic Load Balancer] -->|All Traffic| E3
      E3 -->|Environment Variables| G3[RDS PostgreSQL<br/>alpb-1-instance-1]
      
      style A3 fill:#f9f,stroke:#333,stroke-width:2px
      style C3 fill:#f96,stroke:#333,stroke-width:2px
      style G3 fill:#9ff,stroke:#333,stroke-width:2px
      
      H3[EB Platform Features:<br/>- Managed platform<br/>- Easy rollbacks<br/>- Built-in monitoring<br/>- Zero-downtime deploys]
      C3 -.-> H3
  end
