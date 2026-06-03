import io
from typing import List
from app.models.novel import Novel
from app.models.chapter import Chapter


def _plain_text_to_html(content: str) -> str:
    """Convert plain text to simple HTML with <p> tags."""
    paragraphs = content.split('\n\n')
    return ''.join(f'<p>{p.strip()}</p>\n' for p in paragraphs if p.strip())


def build_epub(novel: Novel, chapters: List[Chapter], include_metadata: bool = True) -> bytes:
    """Build an EPUB file from a novel and its chapters."""
    from ebooklib import epub

    book = epub.EpubBook()
    book.set_identifier(f'novelgen-{novel.id}')
    book.set_title(novel.title)
    book.set_language(novel.language or 'en')
    book.add_author(novel.author.display_name or novel.author.username)

    if include_metadata and novel.theme_description:
        book.add_metadata('DC', 'description', novel.theme_description)
    
    # Add cover image metadata if available
    if include_metadata and hasattr(novel, 'cover_url') and novel.cover_url:
        book.set_cover('cover.jpg', b'')  # Placeholder - actual cover would be downloaded

    # Create chapter EPUB items
    epub_chapters = []
    for ch in chapters:
        ch_title = f'Chapter {ch.chapter_number}: {ch.title}'
        c = epub.EpubHtml(
            title=ch_title,
            file_name=f'chap_{ch.chapter_number}.xhtml',
            lang=novel.language or 'en',
        )
        c.content = f'<h1>{ch_title}</h1>\n{_plain_text_to_html(ch.content)}'
        book.add_item(c)
        epub_chapters.append(c)

    # Define Table of Contents
    book.toc = epub_chapters

    # Add navigation files
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # Define spine
    book.spine = ['nav'] + epub_chapters

    # Default CSS
    style = epub.EpubItem(
        uid="style",
        file_name="style/default.css",
        media_type="text/css",
        content="body { font-family: serif; line-height: 1.6; } h1 { font-size: 1.5em; }",
    )
    book.add_item(style)

    buf = io.BytesIO()
    epub.write_epub(buf, book)
    buf.seek(0)
    return buf.read()


def build_pdf(novel: Novel, chapters: List[Chapter], include_metadata: bool = True) -> bytes:
    """Build a PDF file from a novel and its chapters."""
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Try to use a built-in Unicode font; fall back to the fpdf2 default
    try:
        pdf.add_font('NotoSansSC', '', '/usr/local/share/fonts/NotoSansSC-Regular.ttf', uni=True)
        font_name = 'NotoSansSC'
    except Exception:
        # Fallback: will not render CJK but handles ASCII content
        font_name = 'Helvetica'

    if font_name != 'Helvetica':
        # Title page (with metadata if enabled)
        pdf.set_font(font_name, '', 24)
        pdf.multi_cell(0, 12, novel.title, align='C')
        pdf.ln(6)

        if include_metadata:
            pdf.set_font(font_name, '', 12)
            author_name = novel.author.display_name or novel.author.username
            pdf.cell(0, 8, f'Author: {author_name}', align='C')
            pdf.ln(12)

            if novel.theme_description:
                pdf.set_font(font_name, '', 10)
                pdf.multi_cell(0, 6, novel.theme_description, align='C')

        for ch in chapters:
            pdf.add_page()
            # Chapter title
            pdf.set_font(font_name, '', 18)
            ch_title = f'Chapter {ch.chapter_number}: {ch.title}'
            pdf.multi_cell(0, 10, ch_title)
            pdf.ln(4)

            # Chapter content
            pdf.set_font(font_name, '', 11)
            for paragraph in ch.content.split('\n\n'):
                p = paragraph.strip()
                if p:
                    pdf.multi_cell(0, 6, p)
                    pdf.ln(2)
    else:
        # ASCII-safe rendering using Helvetica
        pdf.set_font('Helvetica', 'B', 24)
        pdf.multi_cell(0, 12, novel.title, align='C')
        pdf.ln(6)

        if include_metadata:
            pdf.set_font('Helvetica', '', 12)
            author_name = novel.author.display_name or novel.author.username
            pdf.cell(0, 8, f'Author: {author_name}', align='C')
            pdf.ln(12)

        for ch in chapters:
            pdf.add_page()
            pdf.set_font('Helvetica', 'B', 18)
            ch_title = f'Chapter {ch.chapter_number}: {ch.title}'
            pdf.multi_cell(0, 10, ch_title)
            pdf.ln(4)

            pdf.set_font('Helvetica', '', 11)
            for paragraph in ch.content.split('\n\n'):
                p = paragraph.strip()
                if p:
                    pdf.multi_cell(0, 6, p)
                    pdf.ln(2)

    return pdf.output()
