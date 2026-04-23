import { GameRole, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fallbackScenarios = [
  {
    title: "Ban cung lop bi treu choc",
    description: "Trong gio ra choi, mot ban bi trieu vi noi giong khac moi nguoi.",
    choices: [
      {
        text: "Cuoi theo de hoa vao nhom",
        role: GameRole.SUPPORTER,
        feedback: "Cuoi theo co the lam ban ay ton thuong hon.",
      },
      {
        text: "Dung nhin va khong lam gi",
        role: GameRole.BYSTANDER,
        feedback: "Im lang co the lam chuyen xau keo dai.",
      },
      {
        text: "Noi dung treu ban nua va bao co giao",
        role: GameRole.DEFENDER,
        feedback: "Ban dang bao ve ban minh rat tot.",
      },
    ],
  },
  {
    title: "Ban moi bi co lap",
    description: "Ban moi vao lop, gio lam nhom khong ai ru ban ay.",
    choices: [
      {
        text: "Noi ke ban ay di",
        role: GameRole.SUPPORTER,
        feedback: "Co lap nguoi khac se lam ban ay buon.",
      },
      {
        text: "Khong noi gi vi so bi trieu",
        role: GameRole.BYSTANDER,
        feedback: "Ban co the giup bang cach moi ban ay vao nhom.",
      },
      {
        text: "Moi ban ay vao nhom va chia viec",
        role: GameRole.DEFENDER,
        feedback: "Ban dang tao mot khong gian an toan va than thien.",
      },
    ],
  },
  {
    title: "Tin nhan che gieu tren nhom chat",
    description: "Ban thay mot tin nhan che bai ngoai hinh cua ban cung lop.",
    choices: [
      {
        text: "Tha icon cuoi cho vui",
        role: GameRole.SUPPORTER,
        feedback: "Du chi la icon, ban kia van co the bi ton thuong.",
      },
      {
        text: "Doc roi bo qua",
        role: GameRole.BYSTANDER,
        feedback: "Bo qua co the lam hanh vi nay lap lai.",
      },
      {
        text: "Noi dung lai va bao giao vien",
        role: GameRole.DEFENDER,
        feedback: "Ban da chon cach an toan de bao ve ban minh.",
      },
    ],
  },
  {
    title: "Ban bi giat do dung hoc tap",
    description: "Trong lop co ban giat but cua ban khac roi nem qua lai.",
    choices: [
      {
        text: "Lay them do de choc cho vui",
        role: GameRole.SUPPORTER,
        feedback: "Hanh dong nay lam tinh huong te hon.",
      },
      {
        text: "Quay di vi khong muon lien quan",
        role: GameRole.BYSTANDER,
        feedback: "Ban co the giup bang cach noi giao vien.",
      },
      {
        text: "Noi tra do va ru ban kia bao co",
        role: GameRole.DEFENDER,
        feedback: "Ban da hanh dong can dam va tu te.",
      },
    ],
  },
  {
    title: "Ban bi dat biet danh kho chiu",
    description: "Mot nhom ban goi nguoi khac bang biet danh ma ban ay khong thich.",
    choices: [
      {
        text: "Lap lai biet danh do",
        role: GameRole.SUPPORTER,
        feedback: "Biet danh gay kho chiu co the lam ban ay mat tu tin.",
      },
      {
        text: "Khong cuoi nhung cung khong noi gi",
        role: GameRole.BYSTANDER,
        feedback: "Ban co the noi nhe rang cach goi do khong on.",
      },
      {
        text: "Noi nhom goi dung ten cua ban ay",
        role: GameRole.DEFENDER,
        feedback: "Ban dang giup ton trong nguoi khac.",
      },
    ],
  },
];

const main = async () => {
  for (const scenario of fallbackScenarios) {
    const exists = await prisma.gameScenario.findFirst({
      where: {
        title: scenario.title,
      },
    });

    if (exists) {
      continue;
    }

    await prisma.gameScenario.create({
      data: {
        title: scenario.title,
        description: scenario.description,
        isAiGenerated: false,
        choices: {
          create: scenario.choices,
        },
      },
    });
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
