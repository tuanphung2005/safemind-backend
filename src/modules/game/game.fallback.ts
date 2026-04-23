import type { ScenarioDraft } from "../../integrations/gemini/gemini.types";

export const fallbackScenarios: ScenarioDraft[] = [
  {
    title: "Bạn thấy bạn cùng lớp bị trêu chọc",
    description:
      "Trong giờ ra chơi, một bạn bị trêu vì nói giọng khác mọi người.",
    choices: [
      {
        text: "Cười theo để hòa vào nhóm",
        role: "supporter",
        feedback:
          "Cười theo có thể làm bạn ấy tổn thương hơn. Mình có thể chọn cách tử tế hơn.",
      },
      {
        text: "Đứng nhìn và không làm gì",
        role: "bystander",
        feedback:
          "Im lặng đôi khi khiến chuyện xấu kéo dài. Bạn có thể giúp bằng lời nói nhẹ nhàng.",
      },
      {
        text: "Nói: đừng trêu bạn nữa, như vậy không vui",
        role: "defender",
        feedback:
          "Bạn đã bảo vệ bạn mình rất tốt. Hành động nhỏ này giúp lớp học an toàn hơn.",
      },
    ],
  },
  {
    title: "Bạn mới bị cô lập trong nhóm",
    description:
      "Một bạn mới vào lớp, giờ làm nhóm không ai rủ bạn ấy cùng làm.",
    choices: [
      {
        text: "Nói nhỏ: kệ bạn ấy đi",
        role: "supporter",
        feedback:
          "Cô lập người khác khiến bạn ấy buồn và sợ. Mình nên chọn cách giúp bạn hòa nhập.",
      },
      {
        text: "Không nói gì vì sợ bị trêu lại",
        role: "bystander",
        feedback:
          "Sợ là bình thường, nhưng bạn vẫn có thể giúp bằng cách mời bạn ấy vào nhóm.",
      },
      {
        text: "Mời bạn ấy vào nhóm và chia việc dễ trước",
        role: "defender",
        feedback:
          "Bạn đang tạo cảm giác được chào đón. Đây là hành động rất tử tế.",
      },
    ],
  },
  {
    title: "Tin nhắn chế giễu trong nhóm chat",
    description:
      "Bạn thấy một tin nhắn chê bai ngoại hình của bạn cùng lớp.",
    choices: [
      {
        text: "Thả biểu tượng cười cho vui",
        role: "supporter",
        feedback:
          "Dù chỉ là biểu tượng, điều đó vẫn có thể khiến bạn kia tổn thương thêm.",
      },
      {
        text: "Đọc rồi bỏ qua",
        role: "bystander",
        feedback:
          "Bỏ qua có thể làm hành vi này lặp lại. Bạn có thể báo người lớn đáng tin cậy.",
      },
      {
        text: "Nhắn: dừng lại, nói vậy không ổn và báo giáo viên",
        role: "defender",
        feedback:
          "Bạn đã chọn cách an toàn và đúng đắn để bảo vệ bạn mình.",
      },
    ],
  },
  {
    title: "Bạn bị giật đồ dùng học tập",
    description:
      "Trong lớp, có bạn giật bút của bạn khác rồi ném qua lại.",
    choices: [
      {
        text: "Lấy thêm đồ của bạn ấy để chọc cho vui",
        role: "supporter",
        feedback:
          "Hành động này làm tình huống tệ hơn. Mình có thể dừng lại và giúp bạn kia.",
      },
      {
        text: "Quay đi vì không muốn liên quan",
        role: "bystander",
        feedback:
          "Không liên quan vẫn là một lựa chọn, nhưng giúp đỡ sẽ làm lớp an toàn hơn.",
      },
      {
        text: "Nói trả đồ lại và rủ bạn kia báo cô",
        role: "defender",
        feedback:
          "Bạn đã can đảm và chọn cách bảo vệ rất hiệu quả.",
      },
    ],
  },
  {
    title: "Bạn bị đặt biệt danh khó chịu",
    description:
      "Một nhóm bạn gọi người khác bằng biệt danh mà bạn ấy không thích.",
    choices: [
      {
        text: "Lặp lại biệt danh đó cho vui",
        role: "supporter",
        feedback:
          "Biệt danh gây khó chịu có thể làm bạn ấy mất tự tin.",
      },
      {
        text: "Không cười nhưng cũng không nói gì",
        role: "bystander",
        feedback:
          "Bạn đã không đồng tình, và bước tiếp theo có thể là nói: mình không thích cách gọi đó.",
      },
      {
        text: "Nói với nhóm: gọi đúng tên bạn ấy nhé",
        role: "defender",
        feedback:
          "Bạn đang giúp tôn trọng người khác. Đây là kỹ năng quan trọng.",
      },
    ],
  },
  {
    title: "Bạn bị đổ lỗi trước lớp",
    description:
      "Một bạn bị đổ lỗi làm mất đồ, dù chưa rõ ai làm.",
    choices: [
      {
        text: "Nói theo nhóm để gây áp lực",
        role: "supporter",
        feedback:
          "Gây áp lực khi chưa rõ sự thật có thể làm bạn khác tổn thương nghiêm trọng.",
      },
      {
        text: "Đứng yên quan sát",
        role: "bystander",
        feedback:
          "Quan sát là bước đầu, nhưng bạn có thể giúp bằng cách đề nghị tìm hiểu rõ sự việc.",
      },
      {
        text: "Đề nghị cả lớp bình tĩnh và nhờ cô hỗ trợ",
        role: "defender",
        feedback:
          "Bạn đã chọn cách công bằng và an toàn cho mọi người.",
      },
    ],
  },
];
