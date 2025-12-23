module.exports = {
  BotOwnerID: process.env.BOT_OWNER_ID || "1078669976875049021",
  ServerID: process.env.SERVER_ID || "1440723119764541534",
  MemberRoleID: process.env.MEMBER_ROLE_ID || "1449104321512738877",
  AllMemberRoles: (process.env.ALL_MEMBER_ROLES || "1449104321512738877,1449104321512738877").split(","),
  DashBoard: process.env.DASHBOARD_URL || "https://mainboat.dates-femboys.fun",
  RulesChannel: process.env.RULES_CHANNEL_ID || "1440723121463365752",
  SelfRoleChannelID: process.env.SELF_ROLE_CHANNEL_ID || "1440723121177886857",
  BotManagerLogs: process.env.BOT_MANAGER_LOGS_ID || "1440936739140145222",
  BoostLogChannel: process.env.BOOST_LOG_CHANNEL_ID || "1440936739140145222",
  SupporterID: process.env.SUPPORTER_ID || "1449104321512738877",
  VaildCats: (process.env.VALID_CATS || "1440728434023207014").split(","),
  GeneralChat: process.env.GENERAL_CHAT_ID || "1440723121463365752",
  OwnerTicket: process.env.OWNER_TICKET_ID || "1440728367644020788",
  FeedBackChannelID: process.env.FEEDBACK_CHANNEL_ID || "1440725115196407839",
  FinishedOrderID: process.env.FINISHED_ORDER_ID || "1440725115196407839",
  AutoDeleteChannelID: process.env.AUTO_DELETE_CHANNEL_ID || "1440734015475679268",
  DonationChannelID: process.env.DONATION_CHANNEL_ID || "1440734015475679268",
  
  overflows: (process.env.OVERFLOW_CATEGORIES || "1440728434023207014,1440728434023207014").split(","),
  StaffApply: process.env.STAFF_APPLY_CATEGORY || "1440728434023207014",

  LoggingChannelID: {
    FinancesLogChannelID: process.env.FINANCES_LOG_CHANNEL_ID || "1440723121177886858",
    PaymentLogChannelID: process.env.PAYMENT_LOG_CHANNEL_ID || "1440723121177886858",
    TicketLogChannelID: process.env.TICKET_LOG_CHANNEL_ID || "1440723121177886858",
    BotManagementChannelID: process.env.BOT_MANAGEMENT_CHANNEL_ID || "1440723121177886858"
  },



  BotSettings: {
    StatusOne: "deadloom",
    StatusTwo: ",help for commands",
    StatusThree: "Order your own bot!",
    StatusFour: "Premade Codes",
    StatusFive: "Premium Bot Hosting",
    StatusSix: "Create a ticket to order",
    StatusSeven: "Unique discord bot codes!"
  },


  ServerRoles: {
    DefaultRoleId: "1449104321512738877",
    FounderId: process.env.FOUNDER_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    OwnerRoleId: process.env.OWNER_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    CoOwnerRoleId: process.env.CO_OWNER_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    ChiefHumanResources: process.env.CHIEF_HR_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    HumanResources: process.env.HR_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    AdminRoleId: process.env.ADMIN_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    ModRoleId: process.env.MOD_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    ChiefSupporterRoleId: process.env.CHIEF_SUPPORTER_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    ChiefBotCreatorRoleId: process.env.CHIEF_BOT_CREATOR_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    BotCreatorRoleId: process.env.BOT_CREATOR_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    SupporterRoleId: process.env.SUPPORTER_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877",
    NewSupporterRoleId: process.env.NEW_SUPPORTER_ROLE_ID || process.env.DEFAULT_STAFF_ROLE_ID || "1449104321512738877"
  },

  OwnerInformation: {
    OwnerID: ["1078669976875049021"],
    OwnerTicketCat: "1440728434023207014"
  },

  OrdersChannelID: {
    RecoverChannelId: process.env.RECOVER_CHANNEL_ID || "1440729079245574324",
    TicketChannelID: process.env.TICKET_CHANNEL_ID || "1440729079245574324",
    FeaturesChannelID: process.env.FEATURES_CHANNEL_ID || "1440729079245574324",
    OrderChannelID: process.env.ORDER_CHANNEL_ID || "1440728567682961510",
    TicketMessageID: process.env.TICKET_MESSAGE_ID || ""
  },

  ApplyTickets: {
    StaffApply: process.env.STAFF_APPLY_CATEGORY || "1440728434023207014",
    PartnerApply: process.env.PARTNER_APPLY_CATEGORY || "1440728434023207014"
  },

  TicketCategorys: {
    SystemBotOrderCategory: "1440723121177886851",
    WaitingBotOrderCategory: "1440723121177886851",
    Permahost: "1440723121177886851",
    AllBotTicketsCategory: "1440723121177886851",
    ModMailBotTicketsCategory: "1440723121177886851",
    CustomBotsTicketCategory: "1440723121177886851",
    ClosedTicketOneCategory: "1440723121177886851",
    ClosedTicketTwoCategory: "1440723121177886851",
    ClosedTicketThreeCategory: "1440723121177886851",
    ClosedTicketFourCategory: "1440723121177886851",
    ClosedTicketFiveCategory: "1440723121177886851"
  },

  HostingDefaults: {
    defaultExpirationDays: 7,
    paidExpirationDays: 30,
    unlimitedTiers: ['premium', 'lifetime']
  },

  MongoDBURI: process.env.MONGODB_URI || '',

  PricingInfo: {
    defaultPrice: process.env.DEFAULT_PRICE || "8 Invites or Server Boosting",
    paymentMethods: process.env.PAYMENT_METHODS || "Server Boosting or INVITES"
  },

  InviteRequirements: {
    RequiredInvites: parseInt(process.env.REQUIRED_INVITES) || 5,
    Enabled: process.env.INVITE_CHECK_ENABLED !== 'false',
    BypassRoleID: process.env.INVITE_BYPASS_ROLE_ID || "1450319362312376331"
  },

  DeadLoomVerification: {
    VerificationChannelID: process.env.VERIFICATION_CHANNEL_ID || "1450261913899372666",
    CodeAccessRoleID: process.env.CODE_ACCESS_ROLE_ID || "1450261991808569415",
    LoggingChannelID: process.env.VERIFICATION_LOG_CHANNEL_ID || "1440731922136301648",
    ChannelName: process.env.DEADLOOM_CHANNEL_NAME || "deadloom",
    CooldownHours: parseInt(process.env.VERIFICATION_COOLDOWN_HOURS) || 24,
    MaxFailuresBeforeAppeal: parseInt(process.env.MAX_FAILURES_BEFORE_APPEAL) || 3,
    AppealCooldownDays: parseInt(process.env.APPEAL_COOLDOWN_DAYS) || 7
  },

  LOAManagement: {
    LOAChannelID: process.env.LOA_CHANNEL_ID || "1450312499453759602",
    LOANotificationEnabled: process.env.LOA_NOTIFICATION_ENABLED !== 'false'
  }
}