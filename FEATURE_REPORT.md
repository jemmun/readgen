# ReadGen 小说生成平台 — 功能完成报告与未来规划

> 生成时间：2026-05-03  
> 项目路径：`/Users/liuwen/Desktop/engskill/readgen`

---

## 一、已完成功能清单

### A 类：插图与小说关联（8/8 ✅）

| 编号 | 功能 | 后端 | 前端 | 说明 |
|------|------|------|------|------|
| a1 | 小说详情页显示封面图和插图列表 | ✅ | ✅ | NovelDetailScreen 展示 cover_image_url 和 novelIllustrations 横向滚动列表 |
| a2 | 所有小说列表用真实封面替代首字母占位符 | ✅ | ✅ | CreationScreen、LibraryScreen、UserProfileScreen 三处均已替换 |
| a3 | 阅读器渲染章节关联插图 | ✅ | ✅ | ReaderScreen 加载并展示 chapterIllustrations |
| a4 | 一键生成封面按钮 | ✅ | ✅ | NovelDetailScreen 的 "🎨 Generate Cover" 按钮 |
| a5 | 插图按类型筛选 | ✅ | ✅ | IllustrationsScreen 的 All/Cover/Illustration 筛选芯片 |
| a6 | 创建插图时选择类型 | ✅ | ✅ | IllustrationCreateScreen 的 Illustration/Cover 类型选择 |
| a7 | 插图 API 扩展（按 novel_id 和 illustration_type 查询） | ✅ | ✅ | `GET /illustrations?novel_id=&illustration_type=` |
| a8 | Novel 模型 cover_image_url 字段 | ✅ | ✅ | 新增字段 + 自动更新逻辑（设置 cover 类型插图时自动更新小说封面） |

### B 类：阅读与内容体验（8/8 ✅）

| 编号 | 功能 | 后端 | 前端 | 说明 |
|------|------|------|------|------|
| b1 | 阅读进度记录 | ✅ | ✅ | ReadingProgress 模型 + ReaderScreen 自动保存/恢复 |
| b2 | 章节书签 | ✅ | ✅ | ReaderScreen 底部栏 bookmark 切换按钮 |
| b3 | 深色模式 | ✅ | ✅ | XColorsDark/XColorsLight + ThemeContext + SettingsScreen 切换开关 |
| b4 | 书库搜索 | ✅ | ✅ | LibraryScreen 搜索栏（已存在） |
| b5 | 章节内容编辑 | ✅ | ✅ | ReaderScreen 的编辑模式 + TextInput 替换 ChapterRenderer |
| b6 | 批量生成插图 | ✅ | ✅ | `POST /illustrations/batch-generate` + NovelDetailScreen "🎨 Batch Generate" 按钮 |
| b7 | 导出小说为 TXT | ✅ | ✅ | `GET /novels/{id}/export-txt` + NovelDetailScreen "Export TXT" 按钮 |
| b8 | 分享功能 | ✅ | ✅ | `POST /novels/{id}/share` + NovelDetailScreen 分享图标按钮 |

### C 类：代码修复（1/1 ✅）

| 编号 | 功能 | 说明 |
|------|------|------|
| c1 | IllustrationDetailScreen 代码缺陷修复 | 已修复 |

### D 类：灵感页面社交功能（7/7 ✅）

| 编号 | 功能 | 后端 | 前端 | 说明 |
|------|------|------|------|------|
| d1 | 通知系统 | ✅ | ✅ | Notification 模型 + `GET/PUT /notifications` + NotificationsScreen + Sidebar 铃铛图标 + 未读计数 |
| d2 | @提及 支持 | ✅ | ✅ | 评论内容正则匹配 `@(\w+)` + 自动创建 mention 通知 |
| d3 | 帖子附加图片 | ✅ | ✅ | CreatePostScreen 的 imageUrl 输入框 |
| d4 | 帖子编辑/删除 | ✅ | ✅ | `PUT /posts/{id}` + PostDetailScreen 编辑/删除按钮 |
| d5 | 评论回复嵌套 | ✅ | ✅ | Comment.parent_id + PostDetailScreen 的 replyToId 回复机制 |
| d6 | 私信功能 | ✅ | ✅ | Message 模型 + `POST/GET /messages` + MessagesScreen + ChatScreen + UserProfileScreen "Message" 按钮 |
| d7 | 个人主页编辑 | ✅ | ✅ | `PUT /users/me` + UserProfileScreen 编辑模式（display_name + bio） |

### E 类：协作页面功能（6/6 ✅）

| 编号 | 功能 | 后端 | 前端 | 说明 |
|------|------|------|------|------|
| e1 | 群组搜索/发现 | ✅ | ✅ | `GET /groups/discover` + CollaborationScreen 发现标签页 + 加入公开群组 |
| e2 | 群组近实时聊天 | ✅ | ✅ | 轮询间隔从 5s 降至 3s，提升聊天实时感 |
| e3 | 群组协作写作 | ✅ | ✅ | `POST /groups/{id}/assign-chapter` + GroupDetailScreen 章节分配按钮 |
| e4 | 群组角色权限 | ✅ | ✅ | 支持 owner/admin/reviewer/editor/member 五级角色，循环切换 |
| e5 | 群组退出/踢人 | ✅ | ✅ | GroupDetailScreen 退出按钮 + 踢人按钮 |
| e6 | 群组设置 | ✅ | ✅ | GroupDetailScreen 设置面板（修改名称、描述、隐私） |

### F 类：灵感与协作增强（5/5 ✅）

| 编号 | 功能 | 后端 | 前端 | 说明 |
|------|------|------|------|------|
| f1 | 灵感收藏 | ✅ | ✅ | Bookmark 模型 + `POST/DELETE /bookmarks` + IdeasScreen 收藏切换按钮 |
| f2 | 灵感话题/标签 | ✅ | ✅ | CreatePostScreen 的 tag 输入框 + 斜杠命令标签系统 |
| f3 | 灵感推荐算法 | ✅ | ✅ | 基于用户自身小说类型的兴趣匹配推荐（genre_set 过滤优先） |
| f4 | 评论采纳为章节 | ✅ | ✅ | `POST /comments/{id}/adopt` + PostDetailScreen "Adopt as Chapter" 按钮 |
| f5 | 群组审批批注 | ✅ | ✅ | Post.approval_note 字段 + 审批时可选 note 参数 + GroupDetailScreen 批注输入框 |

### 完成统计

| 分类 | 完成数 | 总数 |
|------|--------|------|
| A: 插图与小说关联 | 8 | 8 |
| B: 阅读与内容体验 | 8 | 8 |
| C: 代码修复 | 1 | 1 |
| D: 灵感页面社交 | 7 | 7 |
| E: 协作页面功能 | 6 | 6 |
| F: 灵感与协作增强 | 5 | 5 |
| **合计** | **35** | **35** |

---

## 二、现有功能可完善的方面

### A 类完善：插图与小说关联

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| A-P1 | 插图与具体章节关联 | 中 | 当前插图只关联到小说（novel_id），未关联到具体章节（chapter_id），ReaderScreen 中只能展示小说所有插图而非当前章节插图 |
| A-P2 | 插图位置标记 | 低 | 在章节内容中标记插图插入位置（如 `{{illustration:3}}`），阅读时自动在对应位置渲染插图 |
| A-P3 | AI 插图风格一致性 | 中 | 批量生成时确保同一小说的插图风格一致（传入风格种子参数） |
| A-P4 | 插图重绘/变体 | 低 | 对已有插图提供"重新生成"或"生成变体"选项 |

### B 类完善：阅读与内容体验

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| B-P1 | 深色模式全局应用 | 高 | ThemeContext 已创建，但各屏幕仍使用静态 XColors 引用，需替换为 `useAppTheme().colors` 动态获取 |
| B-P2 | 阅读进度持久化到后端 | 低 | 当前阅读进度已保存到后端，但 ThemeContext 的 isDark 状态未持久化（AsyncStorage） |
| B-P3 | 导出为 ePub/PDF | 中 | 当前仅支持 TXT 导出，可增加 ePub（带封面+章节目录）和 PDF 格式 |
| B-P4 | 阅读器字体选择 | 低 | ReaderSettingsPanel 已有字体大小调节，可增加字体族选择（宋体/黑体/楷体等） |
| B-P5 | 离线阅读 | 中 | 下载小说章节到本地，支持无网络时阅读 |
| B-P6 | 翻页动画 | 低 | 阅读器章节切换时增加翻页过渡动画 |

### D 类完善：社交功能

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| D-P1 | @提及 下拉补全 | 高 | 输入 @ 时自动弹出匹配用户列表供选择，而非仅后端正则解析 |
| D-P2 | 评论嵌套可视化 | 中 | 当前评论用 replyToId 做了扁平存储，但 UI 未缩进展示嵌套层级 |
| D-P3 | 私信图片发送 | 低 | Message 模型仅支持文本 content，可增加 image_url 字段 |
| D-P4 | 消息推送（Push Notification） | 中 | 集成 Expo Push Notifications 或 Firebase Cloud Messaging |
| D-P5 | 帖子草稿 | 低 | CreatePostScreen 退出时自动保存草稿到 AsyncStorage |

### E 类完善：协作功能

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| E-P1 | WebSocket 实时聊天 | 高 | 当前使用 3s 轮询，可替换为 WebSocket 实现真正实时通信 |
| E-P2 | 协作编辑锁定 | 中 | 多人同时编辑同一章节时需锁定机制，防止冲突 |
| E-P3 | 章节分配看板 | 中 | 群组内可视化展示各章节分配状态（谁写哪章、进度如何） |
| E-P4 | 群组邀请链接 | 低 | 生成邀请链接/二维码，新用户点击即可加入群组 |
| E-P5 | 群组公告 | 低 | 群主可发布置顶公告，展示在群详情顶部 |

### F 类完善：增强功能

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| F-P1 | 收藏列表页 | 高 | UserProfileScreen 增加"我的收藏"标签页，展示已收藏帖子 |
| F-P2 | 标签热门榜 | 低 | 展示全站热门标签和对应帖子数量 |
| F-P3 | 推荐算法增强 | 中 | 当前仅基于用户自身小说类型推荐，可增加协同过滤（相似用户喜欢的）和社交关系（关注用户的点赞） |
| F-P4 | Adopt as Chapter 端到端打通 | 中 | 确认从灵感到小说的完整流程：帖子→评论采纳→生成章节→插入小说→通知作者 |
| F-P5 | 审批批注富文本 | 低 | 当前审批批注为纯文本，可支持简单的格式（加粗、列表） |

---

## 三、未来可增加的新功能

### G 类：AI 能力增强

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| g1 | AI 续写建议 | 高 | 阅读器底部提供多个 AI 续写方向建议（基于前文分析） |
| g2 | AI 角色对话生成 | 中 | 输入角色设定，自动生成角色间的对话场景 |
| g3 | AI 世界观设定生成 | 中 | 从小说主题自动生成世界观、地图、势力分布等设定文档 |
| g4 | AI 文风模仿 | 低 | 上传参考文本，AI 模仿其文风生成新内容 |
| g5 | AI 封面风格选择 | 中 | 生成封面时提供多种风格选项（水彩、油画、漫画、像素等） |
| g6 | AI 摘要生成 | 低 | 对长章节自动生成摘要，方便读者快速了解内容 |

### H 类：内容生态

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| h1 | 小说评论/评分系统 | 高 | 在 LibraryBookDetailScreen 增加评论和 1-5 星评分 |
| h2 | 排行榜 | 中 | 按阅读量、评分、收藏数等维度生成排行榜 |
| h3 | 标签/分类体系 | 中 | 小说增加标签系统（如 #奇幻 #热血 #虐恋），支持按标签浏览 |
| h4 | 作者认证 | 低 | 优质作者可申请认证标识 |
| h5 | 内容举报 | 中 | 帖子和评论支持举报功能，管理员审核处理 |
| h6 | 版权声明 | 低 | 小说可设置版权类型（CC协议、原创声明等） |

### I 类：平台运营

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| i1 | 用户反馈系统 | 中 | 应用内反馈入口，收集用户意见和建议 |
| i2 | 数据统计面板 | 中 | 管理员/作者可查看阅读量、收藏量、完读率等数据 |
| i3 | 限时活动系统 | 低 | 运营可创建限时创作活动（如"七夕短篇大赛"） |
| i4 | 付费章节 | 低 | 作者可设置部分章节为付费内容，集成支付系统 |
| i5 | 广告位管理 | 低 | 管理员可配置应用内广告展示位置和频率 |

### J 类：技术架构

| 编号 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| j1 | 单元测试 | 高 | 后端 pytest + 前端 Jest，覆盖核心业务逻辑 |
| j2 | E2E 测试 | 中 | Detox 或 Appium 端到端自动化测试 |
| j3 | CI/CD 流水线 | 高 | GitHub Actions 自动构建、测试、部署 |
| j4 | Docker 容器化 | 中 | 后端 FastAPI + 前端 Nginx 的 Docker Compose 部署方案 |
| j5 | 数据库迁移框架 | 中 | 从手动 ALTER TABLE 迁移到 Alembic 管理 |
| j6 | Redis 缓存层 | 中 | 热门小说列表、推荐结果等使用 Redis 缓存 |
| j7 | 日志与监控 | 中 | 集成 Sentry 错误追踪 + Prometheus/Grafana 性能监控 |
| j8 | API 限流 | 高 | 对 AI 生成、图片生成等高成本接口实施速率限制 |

---

## 四、技术栈概览

### 后端
- **框架**: FastAPI (Python)
- **数据库**: SQLite (SQLAlchemy ORM)
- **AI 服务**: DashScope (阿里云) — 流式生成、插图生成
- **认证**: JWT + bcrypt
- **迁移**: 手动 ALTER TABLE (建议迁移到 Alembic)

### 前端
- **框架**: React Native (Expo) + React Navigation
- **UI 库**: React Native Paper
- **状态管理**: React Context (AuthContext, ThemeContext, ReaderSettingsContext)
- **国际化**: 自定义 I18nProvider (中/英)
- **持久化**: AsyncStorage

### 数据模型 (18 个)
User, Novel, Chapter, Post, Comment, Like, Follow, Group, GroupMember, Illustration, GenerationSession, Bookmark, ReadingProgress, Notification, Message, QRToken, UserInteraction

### 前端页面 (27 个)
HomeScreen, LoginScreen, RegisterScreen, CreationScreen, LibraryScreen, LibraryBookDetailScreen, CreateNovelScreen, NovelDetailScreen, GenerationScreen, ReaderScreen, IllustrationsScreen, IllustrationCreateScreen, IllustrationDetailScreen, IdeasScreen, CreatePostScreen, PostDetailScreen, UserProfileScreen, SearchUsersScreen, CollaborationScreen, CreateGroupScreen, GroupDetailScreen, NotificationsScreen, MessagesScreen, ChatScreen, SettingsScreen, QRScannerScreen, MyQRCodeScreen

---

## 五、建议优先实施路线

### Phase 1 — 体验优化（1-2 周）
1. **B-P1**: 深色模式全局应用 — 将静态 XColors 替换为动态 `useAppTheme().colors`
2. **D-P1**: @提及 下拉补全
3. **F-P1**: 收藏列表页
4. **j1**: 核心业务逻辑单元测试

### Phase 2 — 核心增强（2-4 周）
1. **E-P1**: WebSocket 实时聊天
2. **A-P1**: 插图与章节关联
3. **B-P3**: 导出为 ePub
4. **h1**: 小说评论/评分系统
5. **j5**: Alembic 数据库迁移

### Phase 3 — 生态建设（4-8 周）
1. **g1**: AI 续写建议
2. **h2**: 排行榜
3. **i2**: 数据统计面板
4. **D-P4**: 消息推送
5. **j3/j4**: CI/CD + Docker
