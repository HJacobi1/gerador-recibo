const form = document.getElementById("receipt-form");
const printButton = document.getElementById("print-button");
const paper = document.getElementById("paper");
const documentoPagadorInput = document.getElementById("documentoPagador");
const documentoEmissorInput = document.getElementById("documentoEmissor");
const telefoneInput = document.getElementById("telefone");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function toTitleCase(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPaymentMethod(value) {
  if (!value) {
    return "dinheiro";
  }

  return value === "pix" ? "Pix" : toTitleCase(value);
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function formatCpfCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function readFormData() {
  const formData = new FormData(form);
  const valor = Number.parseFloat(formData.get("valor")) || 0;
  const pagador = String(formData.get("pagador") || "").trim();
  const documentoPagador = String(
    formData.get("documentoPagador") || "",
  ).trim();
  const referentePrefixo = String(formData.get("referentePrefixo") || "a");
  const referenteDescricao = String(
    formData.get("referenteDescricao") || "",
  ).trim();
  const emissor = String(formData.get("emissor") || "").trim();
  const documentoEmissor = String(
    formData.get("documentoEmissor") || "",
  ).trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const cidade = String(formData.get("cidade") || "").trim();
  const dataPagamento = String(formData.get("dataPagamento") || "");
  const formaPagamento = String(formData.get("formaPagamento") || "");
  const duasVias = formData.get("duasVias") === "on";

  return {
    valor,
    pagador,
    documentoPagador,
    referentePrefixo,
    referenteDescricao,
    emissor,
    documentoEmissor,
    telefone,
    cidade,
    dataPagamento,
    formaPagamento,
    duasVias,
  };
}

function formatDate(dateValue) {
  if (!dateValue) {
    return fullDateFormatter.format(new Date());
  }

  const date = new Date(`${dateValue}T12:00:00`);
  return fullDateFormatter.format(date);
}

function lessThanThousand(value) {
  const units = [
    "zero",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];
  const tens = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];
  const hundreds = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  if (value < 20) {
    return units[value];
  }

  if (value < 100) {
    const remainder = value % 10;
    return remainder
      ? `${tens[Math.floor(value / 10)]} e ${units[remainder]}`
      : tens[value / 10];
  }

  if (value === 100) {
    return "cem";
  }

  const remainder = value % 100;
  return remainder
    ? `${hundreds[Math.floor(value / 100)]} e ${lessThanThousand(remainder)}`
    : hundreds[value / 100];
}

function integerToWords(value) {
  if (value === 0) {
    return "zero";
  }

  const groups = [
    { value: 1e12, singular: "trilhão", plural: "trilhões" },
    { value: 1e9, singular: "bilhão", plural: "bilhões" },
    { value: 1e6, singular: "milhão", plural: "milhões" },
    { value: 1e3, singular: "mil", plural: "mil" },
  ];
  let remainder = value;
  const parts = [];

  for (const group of groups) {
    if (remainder >= group.value) {
      const count = Math.floor(remainder / group.value);
      remainder %= group.value;

      if (group.value === 1e3) {
        parts.push(count === 1 ? "mil" : `${integerToWords(count)} mil`);
      } else {
        const scale = count === 1 ? group.singular : group.plural;
        parts.push(`${integerToWords(count)} ${scale}`);
      }
    }
  }

  if (remainder > 0) {
    parts.push(lessThanThousand(remainder));
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (remainder > 0 && remainder < 100) {
    return `${parts.slice(0, -1).join(" ")} e ${parts[parts.length - 1]}`;
  }

  return parts.join(" ");
}

function spellOutAmount(value) {
  const absoluteValue = Math.abs(value);
  const reais = Math.floor(absoluteValue);
  const centavos = Math.round((absoluteValue - reais) * 100);

  const reaisText = reais
    ? `${integerToWords(reais)} ${reais === 1 ? "real" : "reais"}`
    : "";
  const centavosText = centavos
    ? `${integerToWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`
    : "";

  if (reais && centavos) {
    return `${reaisText} e ${centavosText}`;
  }

  if (reais) {
    return reaisText;
  }

  if (centavos) {
    return centavosText;
  }

  return "zero reais";
}

function buildReceiptText(data) {
  const pagadorLabel = data.pagador || "________________";
  const pagadorDocumento = data.documentoPagador
    ? `, ${data.documentoPagador}`
    : "";
  const emissorDocumento = data.documentoEmissor
    ? `, ${data.documentoEmissor}`
    : "";
  const descricao = data.referenteDescricao || "____________________";
    const amountExtenso = spellOutAmount(data.valor);

  return `Recebi de <strong>${pagadorLabel}${pagadorDocumento}</strong> a importância de <strong>${amountExtenso}</strong>, referente <strong>${data.referentePrefixo} ${descricao}</strong>. Para maior clareza, firmo o presente recibo, dando plena, geral e irrevogável quitação pelo valor recebido. Emitido por <strong>${data.emissor || "________________"}${emissorDocumento}</strong>.`;
}

function updatePreview() {
  const data = readFormData();
  const amount = currencyFormatter.format(data.valor);
  const city = data.cidade || "Cidade";
  const dateLabel = formatDate(data.dataPagamento);

  document.querySelectorAll('[data-role="valor-box"]').forEach((node) => {
    node.textContent = amount;
  });

  document.querySelectorAll('[data-role="texto"]').forEach((node) => {
    node.innerHTML = buildReceiptText(data);
  });

  document.querySelectorAll('[data-role="local-data"]').forEach((node) => {
    node.textContent = `${city}, ${dateLabel}`;
  });

  document.querySelectorAll('[data-role="emissor"]').forEach((node) => {
    node.textContent = data.emissor || "Nome do emissor";
  });

  document.querySelectorAll('[data-role="documento"]').forEach((node) => {
    node.textContent = data.documentoEmissor || "CPF/CNPJ";
  });

  document.querySelectorAll('[data-role="telefone"]').forEach((node) => {
    node.textContent = data.telefone || "";
  });

  paper.classList.toggle("two-copies", data.duasVias);
}

function setDefaultDate() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60000);
  document.getElementById("dataPagamento").value = localDate
    .toISOString()
    .slice(0, 10);
}

function attachMask(input, formatter) {
  input.addEventListener("input", () => {
    input.value = formatter(input.value);
    updatePreview();
  });
}

form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
form.addEventListener("reset", () => {
  window.setTimeout(() => {
    setDefaultDate();
    updatePreview();
  }, 0);
});

printButton.addEventListener("click", () => {
  updatePreview();
  window.print();
});

attachMask(documentoPagadorInput, formatCpfCnpj);
attachMask(documentoEmissorInput, formatCpfCnpj);
attachMask(telefoneInput, formatPhone);

setDefaultDate();
updatePreview();
